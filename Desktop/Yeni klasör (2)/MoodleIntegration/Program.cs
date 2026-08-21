using MoodleIntegration.Models;
using MoodleIntegration.Services;
using MoodleIntegration.Services.Interfaces;

var builder = WebApplication.CreateBuilder(args);
builder.Services.Configure<MoodleSettings>(
    builder.Configuration.GetSection("Moodle"));

builder.Services.Configure<FtpSettings>(
    builder.Configuration.GetSection("FtpSettings"));
builder.Services.AddHttpClient(); // HttpClient servisini ekler, bu sayede Moodle API'sine HTTP istekleri gönderebiliriz

builder.Services.AddScoped<IMoodleService, MoodleService>(); // IMoodleService arayüzünü MoodleService sınıfına bağlar, bu sayede bağımlılık enjeksiyonu ile MoodleService örneği kullanılabilir

// Add services to the container.
builder.Services.AddControllersWithViews();

builder.Services.AddScoped<IFtpService, FtpService>(); // bu satır IFtpService arayüzünü FtpService sınıfına bağlar, bu sayede bağımlılık enjeksiyonu ile FtpService örneği kullanılabilir

Console.WriteLine("FTP Host: " + builder.Configuration["FtpSettings:Host"]);
Console.WriteLine("FTP User: " + builder.Configuration["FtpSettings:Username"]);

var app = builder.Build();

// Configure the HTTP request pipeline.
if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Home/Error");
    // The default HSTS value is 30 days. You may want to change this for production scenarios, see https://aka.ms/aspnetcore-hsts.
    app.UseHsts();
}

app.UseHttpsRedirection();
app.UseStaticFiles();

app.UseRouting();

app.UseAuthorization();

app.MapControllerRoute(
    name: "default",
    pattern: "{controller=Home}/{action=Index}/{id?}");

app.Run();
