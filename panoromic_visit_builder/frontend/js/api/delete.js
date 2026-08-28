// toursListContainer sayfa yüklendiğinde zaten HTML'de var olduğu için doğrudan yakalayabiliriz
const toursListContainer = document.getElementById('tours-list-container');

// Butonların kendisine değil, onları kapsayan ana listeye tek bir dinleyici ekliyoruz (Event Delegation)
toursListContainer.addEventListener('click', async function (e) {

    // Eğer tıklanan öğe (e.target) 'Sil' butonu ise işlemleri başlat
    if (e.target.classList.contains('btn-delete-tour')) {

        const turId = e.target.getAttribute('data-id');
        const card = e.target.closest('.tour-card'); // Tıklanan butonun kapsayıcı kartını bul
        const turAdi = card.querySelector('h4').textContent; // Kullanıcıya sorarken adını göstermek için

        const onay = confirm(`'${turAdi}' adlı turu tamamen silmek istediğinize emin misiniz?`);

        if (onay) {
            try {
                // Backend'e DELETE isteği at
                const response = await fetch(`http://127.0.0.1:8000/api/delete-tour/${turId}`, {
                    method: 'DELETE'
                });

                const sonuc = await response.json();

                if (sonuc.mesaj) {
                    // 1. Kartı arayüzden anında kaldır
                    card.remove();

                    // 2. Eğer ekranda açık olan projeyi sildiysek, global hafızayı temizle
                    if (window.aktifTurId === turId) {
                        window.aktifTurId = null;
                        window.aktifTurAdi = null;
                        console.log("Aktif tur silindi, global hafıza sıfırlandı.");
                    }
                }
            } catch (error) {
                console.error("Silme hatası:", error);
                alert("Silinirken bir hata oluştu! Backend sunucusunu kontrol et.");
            }
        }
    }
});