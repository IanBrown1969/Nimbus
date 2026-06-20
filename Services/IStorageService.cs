using System.IO;
using System.Threading.Tasks;

namespace Nimbus.AdminApi.Services;

public interface IStorageService
{
    Task<string> UploadFileAsync(Stream fileStream, string fileName, string contentType);
}
