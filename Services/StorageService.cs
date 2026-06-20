using System;
using System.IO;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Configuration;
using Microsoft.AspNetCore.Http;

namespace Nimbus.AdminApi.Services;

public class StorageService : IStorageService
{
    private readonly IWebHostEnvironment _env;
    private readonly IConfiguration _config;
    private readonly IHttpContextAccessor _httpContextAccessor;

    public StorageService(IWebHostEnvironment env, IConfiguration config, IHttpContextAccessor httpContextAccessor)
    {
        _env = env;
        _config = config;
        _httpContextAccessor = httpContextAccessor;
    }

    public async Task<string> UploadFileAsync(Stream fileStream, string fileName, string contentType)
    {
        var connectionString = _config["AzureStorage:ConnectionString"];
        var containerName = _config["AzureStorage:ContainerName"] ?? "uploads";
        var cdnBaseUrl = _config["AzureStorage:CdnBaseUrl"];

        if (!string.IsNullOrEmpty(connectionString))
        {
            try
            {
                return await UploadToAzureBlobAsync(fileStream, fileName, contentType, connectionString, containerName, cdnBaseUrl);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Azure upload failed: {ex.Message}. Falling back to local disk.");
            }
        }

        // Fallback: Local Disk Storage
        var webRoot = _env.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");
        var uploadsFolder = Path.Combine(webRoot, "uploads");
        if (!Directory.Exists(uploadsFolder))
        {
            Directory.CreateDirectory(uploadsFolder);
        }

        var uniqueFileName = $"{Guid.NewGuid()}_{fileName}";
        var filePath = Path.Combine(uploadsFolder, uniqueFileName);

        using (var ws = new FileStream(filePath, FileMode.Create))
        {
            await fileStream.CopyToAsync(ws);
        }

        var request = _httpContextAccessor.HttpContext?.Request;
        var scheme = request?.Scheme ?? "http";
        var host = request?.Host.Value ?? "localhost:5000";
        return $"{scheme}://{host}/uploads/{uniqueFileName}";
    }

    private async Task<string> UploadToAzureBlobAsync(Stream fileStream, string fileName, string contentType, string connectionString, string containerName, string? cdnBaseUrl)
    {
        var uniqueFileName = $"{Guid.NewGuid()}_{fileName}";
        var containerClient = new Azure.Storage.Blobs.BlobContainerClient(connectionString, containerName);
        await containerClient.CreateIfNotExistsAsync(Azure.Storage.Blobs.Models.PublicAccessType.Blob);
        
        var blobClient = containerClient.GetBlobClient(uniqueFileName);
        
        var options = new Azure.Storage.Blobs.Models.BlobUploadOptions
        {
            HttpHeaders = new Azure.Storage.Blobs.Models.BlobHttpHeaders
            {
                ContentType = contentType
            }
        };

        await blobClient.UploadAsync(fileStream, options);

        if (!string.IsNullOrEmpty(cdnBaseUrl))
        {
            return $"{cdnBaseUrl.TrimEnd('/')}/{uniqueFileName}";
        }

        return blobClient.Uri.ToString();
    }
}
