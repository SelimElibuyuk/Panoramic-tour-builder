namespace MoodleIntegration.Services.Interfaces
{
    public interface IFtpService // bu interface, FTP sunucusundan departman ve kurs bilgilerini almak için gerekli metotları tanımlar.
    {
        Task<List<string>> GetDepartmentsAsync(); // FTP sunucusundan departman listesini asenkron olarak döndürür.

        Task<List<string>> GetCoursesAsync(string departmentName);  // Belirli bir departmanın kurs listesini asenkron olarak döndürür.

        Task<List<string>> GetFilesAsync(string departmentName, string courseName); // Belirli bir departman ve kurs için dosya listesini asenkron olarak döndürür.
    }
}