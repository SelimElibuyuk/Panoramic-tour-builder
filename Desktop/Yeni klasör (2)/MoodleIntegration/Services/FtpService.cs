using FluentFTP;
using Microsoft.Extensions.Options;
using MoodleIntegration.Models;
using MoodleIntegration.Services.Interfaces;

namespace MoodleIntegration.Services
{
    public class FtpService : IFtpService
    {
        private readonly FtpSettings _settings;

        public FtpService(IOptions<FtpSettings> options)
        {
            _settings = options.Value;

            Console.WriteLine("===== FTP SETTINGS =====");
            Console.WriteLine($"Host     : {_settings.Host}");
            Console.WriteLine($"Port     : {_settings.Port}");
            Console.WriteLine($"Username : {_settings.Username}");
            Console.WriteLine("========================");
        }

        public async Task<List<string>> GetDepartmentsAsync()
        {
            var departments = new List<string>();
            using var client = CreateClient();
            var isConnected = false;

            try
            {
                await client.Connect();
                isConnected = true;

                foreach (var item in await client.GetListing("/"))
                {
                    if (item.Type == FtpObjectType.Directory)
                    {
                        departments.Add(item.Name);
                    }
                }
            }
            finally
            {
                if (isConnected)
                {
                    await client.Disconnect();
                }
            }

            return departments;
        }

        public async Task<List<string>> GetCoursesAsync(string departmentName)
        {
            var courses = new List<string>();
            using var client = CreateClient();
            var isConnected = false;

            try
            {
                await client.Connect();
                isConnected = true;

                var path = "/" + departmentName;

                foreach (var item in await client.GetListing(path))
                {
                    if (item.Type == FtpObjectType.Directory)
                    {
                        courses.Add(item.Name);
                    }
                }
            }
            finally
            {
                if (isConnected)
                {
                    await client.Disconnect();
                }
            }

            return courses;
        }

        public async Task<List<string>> GetFilesAsync(string departmentName, string courseName)
        {
            var files = new List<string>();
            using var client = CreateClient();
            var isConnected = false;

            try
            {
                await client.Connect();
                isConnected = true;

                var path = $"/{departmentName}/{courseName}";

                foreach (var item in await client.GetListing(path))
                {
                    if (item.Type == FtpObjectType.File)
                    {
                        files.Add(item.Name);
                    }
                }
            }
            finally
            {
                if (isConnected)
                {
                    await client.Disconnect();
                }
            }

            return files;
        }

        private AsyncFtpClient CreateClient()
        {
            var config = new FtpConfig
            {
                EncryptionMode = FtpEncryptionMode.Explicit,
                ValidateAnyCertificate = true
            };

            return new AsyncFtpClient(
                _settings.Host,
                _settings.Username,
                _settings.Password,
                _settings.Port,
                config);
        }
    }
}