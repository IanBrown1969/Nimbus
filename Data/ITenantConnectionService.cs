using System;

namespace Nimbus.DatabaseStructures.Data;

public interface ITenantConnectionService
{
    string GetConnectionString();
}
