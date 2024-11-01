const puppeteer = require('puppeteer');

// Configuración
const prefix = 'ayuntamiento '; // Prefijo opcional para cada búsqueda
const searchEntries = [
  "A Baña",
  "Abegondo",
  "A Capela",
  "A Coruña",
  "A Laracha",
  "Ames",
  "A Pobra do Caramiñal",
  "Aranga",
  "Ares",
  "Arteixo",
  "Arzúa",
  "As Pontes de García Rodríguez",
  "As Somozas",
  "Bergondo",
  "Betanzos",
  "Boimorto",
  "Boiro",
  "Boqueixón",
  "Brión",
  "Cabana de Bergantiños",
  "Cabanas",
  "Camariñas",
  "Cambre",
  "Carballo",
  "Cariño",
  "Carnota",
  "Carral",
  "Cedeira",
  "Cee",
  "Cerceda",
  "Cerdido",
  "Coirós",
  "Corcubión",
  "Coristanco",
  "Culleredo",
  "Curtis",
  "Dodro",
  "Dumbría",
  "Fene",
  "Ferrol",
  "Fisterra",
  "Frades",
  "Irixoa",
  "Laxe",
  "Lousame",
  "Malpica de Bergantiños",
  "Mañón",
  "Mazaricos",
  "Melide",
  "Mesía",
  "Miño",
  "Moeche",
  "Monfero",
  "Mugardos",
  "Muros",
  "Muxía",
  "Narón",
  "Neda",
  "Negreira",
  "Noia",
  "Oleiros",
  "O Pino",
  "Ordes",
  "Oroso",
  "Ortigueira",
  "Outes",
  "Oza-Cesuras",
  "Paderne",
  "Padrón",
  "Ponteceso",
  "Pontedeume",
  "Porto do Son",
  "Rianxo",
  "Ribeira",
  "Rois",
  "Sada",
  "San Sadurniño",
  "Santa Comba",
  "Santiago de Compostela",
  "Santiso",
  "Sobrado",
  "Teo",
  "Toques",
  "Tordoia",
  "Touro",
  "Trazo",
  "Val do Dubra",
  "Valdoviño",
  "Vedra",
  "Vilarmaior",
  "Vilasantar",
  "Vimianzo",
  "Zas"
]; // Búsquedas
const searchEngineChoice = 2; // 1 para Google, 2 para Bing, 3 para DuckDuckGo

async function searchGoogleBingDuck(entries) {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    // Configurar User-Agent
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.102 Safari/537.36');

    // Definir URL base y selector según el motor de búsqueda elegido
    let baseUrl;
    let inputSelector;
    let resultSelector;

    switch (searchEngineChoice) {
        case 1:
            baseUrl = 'https://www.google.com';
            inputSelector = 'input[name="q"]';
            resultSelector = 'h3 a, .yuRUbf a'; // Selector de Google
            break;
        case 2:
            baseUrl = 'https://www.bing.com';
            inputSelector = 'input[name="q"]';
            resultSelector = '.b_algo a'; // Selector de Bing
            break;
        case 3:
            baseUrl = 'https://duckduckgo.com';
            inputSelector = 'input[name="q"]';
            resultSelector = '.result__a'; // Selector de DuckDuckGo
            break;
        default:
            console.log("Motor de búsqueda no válido. Usa 1 para Google, 2 para Bing o 3 para DuckDuckGo.");
            await browser.close();
            return;
    }

    const results = {};

    for (const query of entries) {
        const searchQuery = `${prefix}${query}`; // Concatenar el prefijo al término de búsqueda
        console.log(`Buscando: ${searchQuery} en ${baseUrl}`);

        try {
            // Navegar a la página del motor de búsqueda
            await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });

            // Esperar el campo de entrada con un timeout de 3000 ms
            await page.waitForSelector(inputSelector, { timeout: 3000 });
            await page.type(inputSelector, searchQuery);
            await page.keyboard.press('Enter');
            await page.waitForSelector(resultSelector, { timeout: 3000 }); // Espera a los resultados

            // Obtener la URL del primer resultado
            const firstResultUrl = await page.evaluate((selector) => {
                const resultLink = document.querySelector(selector);
                return resultLink ? resultLink.href : null;
            }, resultSelector);

            if (firstResultUrl) {
                console.log(`Primer resultado para "${searchQuery}": ${firstResultUrl}`);
                results[searchQuery] = firstResultUrl;
            } else {
                console.log(`No se encontró resultado para "${searchQuery}"`);
                results[searchQuery] = 'No se encontró resultado';
            }
        } catch (error) {
            console.log(`Error al buscar "${searchQuery}" en ${baseUrl}: ${error.message}`);
            results[searchQuery] = 'Error en la búsqueda';
        }
    }

    await browser.close();
    return results;
}

// Ejemplo de uso
(async () => {
    const searchResults = await searchGoogleBingDuck(searchEntries);

    // Mostrar resultados
    console.log("\nResultados:");
    for (const [query, url] of Object.entries(searchResults)) {
        console.log(`${query}: ${url}`);
    }
})();
