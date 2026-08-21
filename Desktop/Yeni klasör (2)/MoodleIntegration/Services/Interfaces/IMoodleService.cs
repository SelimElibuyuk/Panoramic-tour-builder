using MoodleIntegration.ViewModels;

namespace MoodleIntegration.Services.Interfaces
{
    public interface IMoodleService
    {
        Task<string> GetCoursesAsync();

        Task<string> CreateUserAsync(CreateUserViewModel model);

        Task<string> AddUserToCohortAsync(int userId, int cohortId);// bu metod, kullanıcıyı belirli bir kohorta eklemek için kullanılabilir.
        // moodle services bu metodları implement etmelidir.

        Task<string> CreateCategoryAsync(string categoryName);

        Task<int?> GetCohortIdByNameAsync(string cohortName); 
        Task<string> CreateCourseAsync(string courseName, int categoryId);
        

    }
}
