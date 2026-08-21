using Microsoft.Extensions.Options;
using MoodleIntegration.Models;
using MoodleIntegration.Services.Interfaces;
using MoodleIntegration.ViewModels;
using System.Text.Json;

namespace MoodleIntegration.Services
{
    public class MoodleService : IMoodleService
    {
        private readonly HttpClient _httpClient;
        private readonly MoodleSettings _settings;

        public MoodleService(
            HttpClient httpClient,
            IOptions<MoodleSettings> options)
        {
            _httpClient = httpClient;
            _settings = options.Value;
        }

        // Kursları getir
        public async Task<string> GetCoursesAsync()
        {
            var url =
                $"{_settings.BaseUrl}/webservice/rest/server.php" +
                $"?wstoken={_settings.Token}" +
                $"&wsfunction=core_course_get_courses" +
                $"&moodlewsrestformat=json";

            return await _httpClient.GetStringAsync(url);
        }

        // Kategorileri getir
        public async Task<string> GetCategoriesAsync()
        {
            var url = $"{_settings.BaseUrl}/webservice/rest/server.php";

            var formData = new Dictionary<string, string>
            {
                { "wstoken", _settings.Token },
                { "wsfunction", "core_course_get_categories" },
                { "moodlewsrestformat", "json" }
            };

            var content = new FormUrlEncodedContent(formData);
            var response = await _httpClient.PostAsync(url, content);

            return await response.Content.ReadAsStringAsync();
        }

        // Kullanıcı oluştur
        public async Task<string> CreateUserAsync(CreateUserViewModel model)
        {
            int? cohortId = await GetCohortIdByNameAsync(model.Department);

            if (cohortId == null)
            {
                return $"COHORT BULUNAMADI: {model.Department}. Kullanıcı oluşturulmadı.";
            }

            var url = $"{_settings.BaseUrl}/webservice/rest/server.php";

            var formData = new Dictionary<string, string>
            {
                { "wstoken", _settings.Token },
                { "wsfunction", "core_user_create_users" },
                { "moodlewsrestformat", "json" },

                { "users[0][username]", model.Username },
                { "users[0][password]", model.Password },
                { "users[0][firstname]", model.FirstName },
                { "users[0][lastname]", model.LastName },
                { "users[0][email]", model.Email },
                { "users[0][lang]", "en" }
            };

            var content = new FormUrlEncodedContent(formData);
            var response = await _httpClient.PostAsync(url, content);

            var json = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                return json;
            }

            var document = JsonDocument.Parse(json);

            if (document.RootElement.ValueKind != JsonValueKind.Array)
            {
                return json;
            }

            int userId = document.RootElement[0]
                .GetProperty("id")
                .GetInt32();

            var cohortResult = await AddUserToCohortAsync(userId, cohortId.Value);

            return $"{json}\n\nCOHORT SONUCU:\n{cohortResult}";
        }

        // Kullanıcıyı belirli bir kohorta ekle
        public async Task<string> AddUserToCohortAsync(int userId, int cohortId)
        {
            var url = $"{_settings.BaseUrl}/webservice/rest/server.php";

            var formData = new Dictionary<string, string>
            {
                { "wstoken", _settings.Token },
                { "wsfunction", "core_cohort_add_cohort_members" },
                { "moodlewsrestformat", "json" },

                { "members[0][cohorttype][type]", "id" },
                { "members[0][cohorttype][value]", cohortId.ToString() },

                { "members[0][usertype][type]", "id" },
                { "members[0][usertype][value]", userId.ToString() }
            };

            var content = new FormUrlEncodedContent(formData);
            var response = await _httpClient.PostAsync(url, content);

            return await response.Content.ReadAsStringAsync();
        }

        // Bu metod kullanıcıyı belirli bir kohorta eklemek için kullanılabilir.
        public async Task<int?> GetCohortIdByNameAsync(string cohortName)
        {
            var url = $"{_settings.BaseUrl}/webservice/rest/server.php";

            var formData = new Dictionary<string, string>
            {
                { "wstoken", _settings.Token },
                { "wsfunction", "core_cohort_get_cohorts" },
                { "moodlewsrestformat", "json" }
            };

            var content = new FormUrlEncodedContent(formData);
            var response = await _httpClient.PostAsync(url, content);

            if (!response.IsSuccessStatusCode)
            {
                return null;
            }

            var json = await response.Content.ReadAsStringAsync();

            Console.WriteLine("COHORT RESPONSE:");
            Console.WriteLine(json);

            var document = JsonDocument.Parse(json);

            if (!document.RootElement.TryGetProperty("cohorts", out var cohorts))
            {
                return null;
            }

            foreach (var cohort in cohorts.EnumerateArray())
            {
                if (cohort.GetProperty("name").GetString() == cohortName)
                {
                    return cohort.GetProperty("id").GetInt32();
                }
            }

            return null;
        }

        // Moodle kategori oluştur
        public async Task<string> CreateCategoryAsync(string categoryName)
        {
            // Önce mevcut kategorileri kontrol et
            var categoriesJson = await GetCategoriesAsync();

            if (categoriesJson.Contains($"\"name\":\"{categoryName}\""))
            {
                return $"{categoryName} zaten mevcut.";
            }

            var url = $"{_settings.BaseUrl}/webservice/rest/server.php";

            var formData = new Dictionary<string, string>
            {
                { "wstoken", _settings.Token },
                { "wsfunction", "core_course_create_categories" },
                { "moodlewsrestformat", "json" },

                { "categories[0][name]", categoryName },
                { "categories[0][parent]", "0" }
            };

            var content = new FormUrlEncodedContent(formData);
            var response = await _httpClient.PostAsync(url, content);

            return await response.Content.ReadAsStringAsync();
        }
        public async Task<string> CreateCourseAsync(string courseName, int categoryId)
        {
            var url = $"{_settings.BaseUrl}/webservice/rest/server.php";

            var formData = new Dictionary<string, string>
            {
                { "wstoken", _settings.Token },
                { "wsfunction", "core_course_create_courses" },
                { "moodlewsrestformat", "json" },

                { "courses[0][fullname]", courseName },
                { "courses[0][shortname]", courseName },
                { "courses[0][categoryid]", categoryId.ToString() }
            };

            var content = new FormUrlEncodedContent(formData);

            var response = await _httpClient.PostAsync(url, content);

            return await response.Content.ReadAsStringAsync();
        }
        
    }
}