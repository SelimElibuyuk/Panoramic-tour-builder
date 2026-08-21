using System.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using MoodleIntegration.Models;
using MoodleIntegration.Services.Interfaces;
using MoodleIntegration.ViewModels;

namespace MoodleIntegration.Controllers;

public class HomeController : Controller
{
    private readonly ILogger<HomeController> _logger;
    private readonly IMoodleService _moodleService;
    private readonly IFtpService _ftpService;

    // Controller nesnesi oluşturulurken DI ile gerekli servisler enjekte edilir.
    public HomeController(
        ILogger<HomeController> logger,
        IMoodleService moodleService,
        IFtpService ftpService)
    {
        _logger = logger;
        _moodleService = moodleService;
        _ftpService = ftpService;
    }

    // Ana sayfa görünümünü döndürür.
    public IActionResult Index()
    {
        return View();
    }

    // Gizlilik sayfası görünümünü döndürür.
    public IActionResult Privacy()
    {
        return View();
    }

    // Moodle sunucusundan kurs listesini JSON formatında döndürür.
    public async Task<IActionResult> Test()
    {
        var result = await _moodleService.GetCoursesAsync();

        return Content(result, "application/json");
    }

    // FTP sunucusundan departman listesini metin olarak döndürür.
    public async Task<IActionResult> TestFtp()
    {
        var departments = await _ftpService.GetDepartmentsAsync();

        return Content(string.Join("\n", departments));
    }

    // Belirli bir departmanın kurslarını test amaçlı döndürür.
    [HttpGet]
    public async Task<IActionResult> TestCourses()
    {
        var courses = await _ftpService.GetCoursesAsync("BT");

        return Json(courses);
    }
    [HttpGet]
    public async Task<IActionResult> TestFiles()
    {
        var files = await _ftpService.GetFilesAsync(
            "BT",
            "A1-A2 İngilizce");

        return Json(files);
    }

    [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
    public IActionResult Error()
    {
        return View(new ErrorViewModel
        {
            RequestId = Activity.Current?.Id ?? HttpContext.TraceIdentifier
        });
    }

    // Kullanıcı oluşturma ekranını GET ile gösterir.
    [HttpGet]
    public IActionResult CreateUser()
    {
        return View();
    }

    // Formdan gelen veriyi Moodle'e göndererek kullanıcı yaratır.
    [HttpPost]
    public async Task<IActionResult> CreateUser(CreateUserViewModel model)
    {
        var result = await _moodleService.CreateUserAsync(model);

        ViewBag.Result = result;

        return View(model);
    }

    // FTP departmanlarını dolaşıp Moodle kategorileri olarak senkronize eder.
    public async Task<IActionResult> SyncDepartments()
    {
        var departments = await _ftpService.GetDepartmentsAsync();
        var results = new List<string>();

        foreach (var department in departments)
        {
            var result = await _moodleService.CreateCategoryAsync(department);
            results.Add($"{department}: {result}");
        }

        return Content(string.Join("\n\n", results));
    }

    // FTP üzerinde bulunan kursları Moodle için senkronize eder.
    [HttpGet]
    public async Task<IActionResult> SyncCourses()
    {
        var result = new List<string>();

        // Şimdilik BT ile test ediyoruz.
        string department = "BT";

        // FTP'den BT altındaki kurs klasörlerini alır.
        var courses = await _ftpService.GetCoursesAsync(department);

        // Moodle'daki BT kategori id değerini belirtir.
        int categoryId = 6;

        foreach (var course in courses)
        {
            var moodleResult = await _moodleService.CreateCourseAsync(
                course,
                categoryId);

            result.Add($"{course}: {moodleResult}");
        }

        return Content(string.Join("\n\n", result));
    }
}