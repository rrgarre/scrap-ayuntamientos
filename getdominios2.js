const puppeteer = require('puppeteer');
const fs = require('fs');

// Configuración
const prefix = 'ayuntamiento '; // Prefijo opcional para cada búsqueda
const searchEntries = [
  'A Baña',
  'Abegondo',
  'A Capela'
]; // Búsquedas
const searchEngineChoice = 1; // 1 para Google, 2 para Bing, 3 para DuckDuckGo
const excludedKeywords = ["sede"]; // Palabras clave a excluir en los dominios
const outputFileName = './FICHEROS TEMPORALES/DOMINIOS.csv'; // Nombre del archivo de salida

async function searchGoogleBingDuck(entries) {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    // Configurar User-Agent
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.102 Safari/537.36');

    // Definir URL base y selector según el motor de búsqueda elegido
    let baseUrl;
    let inputSelectors;
    let resultSelector;
    let consentButtonSelector;

    switch (searchEngineChoice) {
        case 1:
            baseUrl = 'https://www.google.com/ncr';
            inputSelectors = ['textarea[name="q"]', 'textarea[aria-label="Buscar"]', '#APjFqb'];
            resultSelector = 'h3 a, .yuRUbf a';
            consentButtonSelector = '#L2AGLb';
            break;
        case 2:
            baseUrl = 'https://www.bing.com';
            inputSelectors = ['input[name="q"]'];
            resultSelector = '.b_algo a';
            break;
        case 3:
            baseUrl = 'https://duckduckgo.com';
            inputSelectors = ['input[name="q"]'];
            resultSelector = '.result__a';
            break;
        default:
            console.log("Motor de búsqueda no válido. Usa 1 para Google, 2 para Bing o 3 para DuckDuckGo.");
            await browser.close();
            return;
    }

    const results = {};

    for (const query of entries) {
        const searchQuery = `${prefix}${query}`;
        console.log(`Buscando: ${searchQuery} en ${baseUrl}`);

        try {
            console.log(`Abriendo ${baseUrl}...`);
            await page.goto(baseUrl, { waitUntil: 'networkidle2', timeout: 60000 });
            console.log(`Página cargada: ${baseUrl}`);

            if (consentButtonSelector) {
                try {
                    console.log(`Buscando botón de consentimiento: ${consentButtonSelector}`);
                    await page.waitForSelector(consentButtonSelector, { timeout: 3000 });
                    await page.click(consentButtonSelector);
                    console.log("Consentimiento de cookies aceptado.");
                } catch {
                    console.log("No se encontró el botón de consentimiento o ya fue aceptado.");
                }
            }

            let searchInput = null;

            // Probar múltiples selectores hasta encontrar el campo de búsqueda
            for (const selector of inputSelectors) {
                try {
                    console.log(`Buscando selector del campo de búsqueda: ${selector}`);
                    searchInput = await page.waitForSelector(selector, { timeout: 5000 });
                    if (searchInput) break;
                } catch {
                    console.log(`No se encontró el selector: ${selector}, intentando el siguiente...`);
                }
            }

            if (searchInput) {
                console.log(`Campo de búsqueda encontrado. Escribiendo "${searchQuery}"`);
                await searchInput.type(searchQuery);
                await page.keyboard.press('Enter');

                console.log(`Esperando resultados con selector: ${resultSelector}`);
                await page.waitForSelector(resultSelector, { timeout: 5000 });
                console.log(`Resultados cargados para "${searchQuery}"`);

                let firstResultUrl = null;
                const links = await page.$$eval(resultSelector, results => results.map(result => result.href));

                for (const url of links) {
                    if (!excludedKeywords.some(keyword => url.includes(keyword))) {
                        firstResultUrl = url;
                        break;
                    }
                }

                if (firstResultUrl) {
                    console.log(`Primer resultado para "${searchQuery}" sin palabras clave excluidas: ${firstResultUrl}`);
                    results[query] = firstResultUrl;
                } else {
                    console.log(`No se encontró un resultado adecuado para "${searchQuery}"`);
                    results[query] = 'No se encontró un resultado adecuado';
                }
            } else {
                console.log(`Campo de búsqueda no encontrado para "${searchQuery}" en ${baseUrl}`);
                results[query] = 'Campo de búsqueda no encontrado';
            }
        } catch (error) {
            console.log(`Error al buscar "${searchQuery}" en ${baseUrl}: ${error.message}`);
            results[query] = 'Error en la búsqueda';
        }
    }

    await browser.close();
    return results;
}

// Ejemplo de uso
(async () => {
    const searchResults = await searchGoogleBingDuck(searchEntries);

    console.log("\nResultados:");
    let output = 'municipio,dominio\n'; // Encabezado del archivo CSV
    for (const [municipio, url] of Object.entries(searchResults)) {
        if (url.startsWith('http')) {
            console.log(`${municipio},${url}`);
            output += `${municipio},${url}\n`;
        } else {
            // Agregar mensaje de error en el CSV
            console.log(`${municipio},${url}`);
            output += `${municipio},${url}\n`;
        }
    }

    // Guardar los resultados en un archivo
    fs.writeFileSync(outputFileName, output);
    console.log(`\nResultados guardados en ${outputFileName}`);
})();
