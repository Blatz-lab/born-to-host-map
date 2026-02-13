let map;
let markers = [];
let geocoder;
let apartmentsData = [];
let currentApartments = [];

// Coordonnées du Palais des Festivals à Cannes
const palaisFestivals = { lat: 43.5511, lng: 7.0178 };

// Adresse de l'agence Born To Host
const agenceBornToHost = '21 rue félix faure 06400 Cannes';

// URL de ton Google Sheets publié en CSV
const SHEETS_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSHa6Slmk1S7RaU5zgzphOqTv_YOuLaA0muWlPkJEe8BBZNQLa46jVjpWm8OxDvBPRXTXa8D6c3vYhq/pub?gid=0&single=true&output=csv';

// Initialisation de la carte
window.initMap = function() {
    geocoder = new google.maps.Geocoder();
    
    map = new google.maps.Map(document.getElementById('map'), {
        zoom: 14,
        center: palaisFestivals
    });
    
    // Ajouter un marqueur pour le Palais des Festivals
    new google.maps.Marker({
        position: palaisFestivals,
        map: map,
        title: "Palais des Festivals",
        icon: {
            url: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png'
        }
    });
    
    // Ajouter un marqueur pour l'agence Born To Host
    addAgenceMarker();
    
    // Ajouter la légende
    addLegend();
    
    // Ajouter le style pour le texte avec contour
    addTextOutlineStyle();
    
    // Charger les données depuis Google Sheets
    loadApartmentsData();
    
    // Vérifier si c'est un lien de partage
    checkForSharedLink();
};

// Vérifier si l'URL contient des appartements partagés
function checkForSharedLink() {
    const urlParams = new URLSearchParams(window.location.search);
    const sharedApparts = urlParams.get('apparts');
    
    if (sharedApparts) {
        // Attendre que les données soient chargées
        const checkData = setInterval(() => {
            if (apartmentsData.length > 0) {
                clearInterval(checkData);
                document.getElementById('search').value = sharedApparts;
                searchApartments();
            }
        }, 100);
    }
}

// Générer un lien de partage
function generateShareLink() {
    if (currentApartments.length === 0) {
        alert('Veuillez d\'abord rechercher et afficher des appartements sur la carte.');
        return;
    }
    
    const references = currentApartments.map(apt => apt.reference).join(',');
    const baseUrl = window.location.origin + window.location.pathname;
    const shareUrl = `${baseUrl}?apparts=${encodeURIComponent(references)}`;
    
    document.getElementById('share-link').value = shareUrl;
    document.getElementById('share-link-container').style.display = 'block';
}

// Copier le lien de partage
function copyShareLink() {
    const shareLinkInput = document.getElementById('share-link');
    shareLinkInput.select();
    shareLinkInput.setSelectionRange(0, 99999);
    
    navigator.clipboard.writeText(shareLinkInput.value).then(() => {
        const copyButton = document.querySelector('.copy-button');
        const originalText = copyButton.textContent;
        copyButton.textContent = '✓ Copié !';
        copyButton.style.backgroundColor = '#2d8e47';
        
        setTimeout(() => {
            copyButton.textContent = originalText;
            copyButton.style.backgroundColor = '#34a853';
        }, 2000);
    }).catch(err => {
        alert('Erreur lors de la copie. Veuillez copier manuellement le lien.');
    });
}

// Ajouter le marqueur de l'agence Born To Host
function addAgenceMarker() {
    geocoder.geocode({ address: agenceBornToHost }, (results, status) => {
        if (status === 'OK') {
            new google.maps.Marker({
                position: results[0].geometry.location,
                map: map,
                title: "Agence Born To Host",
                icon: {
                    url: 'https://maps.google.com/mapfiles/ms/icons/green-dot.png'
                }
            });
        } else {
            console.error('Geocode failed for agence: ' + status);
        }
    });
}

// Ajouter le style CSS pour le contour du texte
function addTextOutlineStyle() {
    const style = document.createElement('style');
    style.textContent = `
        div[style*="position: absolute"] div[style*="font-weight: bold"] {
            text-shadow: 
                -2px -2px 0 #000,  
                2px -2px 0 #000,
                -2px 2px 0 #000,
                2px 2px 0 #000,
                -2px 0 0 #000,
                2px 0 0 #000,
                0 -2px 0 #000,
                0 2px 0 #000 !important;
        }
    `;
    document.head.appendChild(style);
}

// Ajouter la légende à la carte
function addLegend() {
    const legend = document.createElement('div');
    legend.id = 'legend';
    legend.innerHTML = `
        <div style="background: white; padding: 15px; margin: 10px; border-radius: 8px; box-shadow: 0 2px 6px rgba(0,0,0,0.3); font-family: Arial, sans-serif;">
            <h3 style="margin: 0 0 10px 0; font-size: 14px; font-weight: bold; color: #333;">Légende</h3>
            <div style="display: flex; align-items: center; margin-bottom: 8px;">
                <img src="https://maps.google.com/mapfiles/ms/icons/blue-dot.png" style="width: 20px; height: 20px; margin-right: 8px;">
                <span style="font-size: 13px; color: #555;">Palais des Festivals</span>
            </div>
            <div style="display: flex; align-items: center; margin-bottom: 8px;">
                <img src="https://maps.google.com/mapfiles/ms/icons/green-dot.png" style="width: 20px; height: 20px; margin-right: 8px;">
                <span style="font-size: 13px; color: #555;">Agence Born To Host</span>
            </div>
            <div style="display: flex; align-items: center;">
                <img src="https://maps.google.com/mapfiles/ms/icons/red-dot.png" style="width: 20px; height: 20px; margin-right: 8px;">
                <span style="font-size: 13px; color: #555;">Appartements Born To Host</span>
            </div>
        </div>
    `;
    map.controls[google.maps.ControlPosition.RIGHT_BOTTOM].push(legend);
}

// Charger les données depuis Google Sheets
function loadApartmentsData() {
    fetch(SHEETS_URL)
        .then(response => response.text())
        .then(csvText => {
            apartmentsData = parseCSV(csvText);
            console.log('Données chargées:', apartmentsData);
        })
        .catch(error => {
            console.error('Erreur lors du chargement des données:', error);
            alert('Impossible de charger les données. Vérifiez l\'URL de votre Google Sheets.');
        });
}

// Parser le CSV
function parseCSV(csvText) {
    const lines = csvText.split('\n');
    const data = [];
    
    for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim() === '') continue;
        
        const values = lines[i].split(',');
        const apartment = {
            reference: values[0]?.trim(),
            address: values[1]?.trim()
        };
        
        if (apartment.reference && apartment.address) {
            data.push(apartment);
        }
    }
    
    return data;
}

// Rechercher et afficher les appartements
window.searchApartments = function() {
    const searchInput = document.getElementById('search').value.trim().toUpperCase();
    
    if (searchInput === '') {
        alert('Veuillez entrer au moins une référence d\'appartement');
        return;
    }
    
    if (apartmentsData.length === 0) {
        alert('Les données ne sont pas encore chargées. Vérifiez que l\'URL du Google Sheets est correcte.');
        return;
    }
    
    clearMap();
    
    const references = searchInput.split(',').map(ref => ref.trim());
    const foundApartments = [];
    
    references.forEach(ref => {
        const apartment = apartmentsData.find(apt => apt.reference.toUpperCase() === ref);
        
        if (apartment) {
            foundApartments.push(apartment);
            addMarkerForApartment(apartment);
        } else {
            console.warn(`Appartement ${ref} non trouvé dans les données`);
        }
    });
    
    currentApartments = foundApartments;
    displaySelectedApartments(foundApartments);
    
    if (foundApartments.length === 0) {
        alert('Aucun appartement trouvé avec cette/ces référence(s).');
    }
};

// Ajouter un marqueur pour un appartement
function addMarkerForApartment(apartment) {
    geocoder.geocode({ address: apartment.address + ', Cannes, France' }, (results, status) => {
        if (status === 'OK') {
            const marker = new google.maps.Marker({
                map: map,
                position: results[0].geometry.location,
                title: apartment.reference,
                label: {
                    text: apartment.reference,
                    color: 'white',
                    fontSize: '14px',
                    fontWeight: 'bold'
                },
                icon: {
                    url: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png',
                    labelOrigin: new google.maps.Point(15, 10)
                }
            });
            
            markers.push(marker);
            
            const infowindow = new google.maps.InfoWindow({
                content: `<strong>${apartment.reference}</strong><br>${apartment.address}`
            });
            
            marker.addListener('click', () => {
                infowindow.open(map, marker);
            });
        } else {
            console.error('Geocode failed for ' + apartment.address + ': ' + status);
        }
    });
}

// Afficher la liste des appartements sélectionnés
function displaySelectedApartments(apartments) {
    const container = document.getElementById('selected-apartments');
    
    if (apartments.length === 0) {
        container.style.display = 'none';
        return;
    }
    
    let html = '<h3>Appartements affichés sur la carte :</h3><ul>';
    apartments.forEach(apt => {
        html += `<li><strong>${apt.reference}</strong> - ${apt.address}</li>`;
    });
    html += '</ul>';
    
    container.innerHTML = html;
    container.style.display = 'block';
}

// Effacer la carte
window.clearMap = function() {
    markers.forEach(marker => marker.setMap(null));
    markers = [];
    currentApartments = [];
    document.getElementById('selected-apartments').style.display = 'none';
    document.getElementById('share-link-container').style.display = 'none';
};
