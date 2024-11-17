const puppeteer = require('puppeteer');
const fs = require('fs');

// Configuración
const prefix = 'ayuntamiento '; // Prefijo opcional para cada búsqueda
const searchEntries = [
  'A Baña,3.450',
'A Capela,1.232',
'A Coruña,245.711',
'A Laracha,11.347',
'A Pobra do Caramiñal,9.338',
'Abegondo,5.406',
'Ames,31.793',
'Aranga,1.849',
'Ares,5.732',
'Arteixo,32.262',
'Arzúa,6.041',
'As Pontes de García Rodríguez,10.138',
'As Somozas,1.098',
'Bergondo,6.633',
'Betanzos,12.959',
'Boimorto,1.985',
'Boiro,18.838',
'Boqueixón,4.220',
'Brión,7.837',
'Cabana de Bergantiños,4.248',
'Cabanas,3.281',
'Camariñas,5.272',
'Cambre,24.648',
'Cariño,3.838',
'Carnota,3.957',
'Carral,6.408',
'Cedeira,6.640',
'Cee (A Coruña),7.546',
'Cerdido,1.113',
'Coirós,1.824',
'Corcubión,1.589',
'Coristanco,6.074',
'Culleredo,30.402',
'Curtis,3.983',
'Dodro,2.768',
'Dumbría,2.983',
'Fene,12.944',
'Ferrol,66.065',
'Fisterra,4.708',
'Frades,2.339',
'Irixoa,1.334',
'Laxe,3.016',
'Lousame,3.338',
'Malpica de Bergantiños,5.391',
'Mazaricos,3.885',
'Mañón,1.356',
'Mellid,7.406',
'Mesía,2.530',
'Miño,6.200',
'Moeche,1.226',
'Monfero,1.932',
'Mugardos,5.245',
'Muros (A Coruña),8.556',
'Muxía,4.657',
'Narón,39.080',
'Neda,5.079',
'Negreira,6.827',
'Noia,14.263',
'O Pino,4.641',
'Oleiros,36.075',
'Ordes,12.674',
'Oroso,7.500',
'Ortigueira,5.671',
'Outes,6.282',
'Oza-Cesuras,5.101',
'Paderne,2.394',
'Padrón,8.384',
'Ponteceso,5.502',
'Pontedeume,7.777',
'Porto do Son,9.171',
'Rianxo,11.033',
'Ribeira,26.886',
'Rois,4.512',
'Sada,15.841',
'San Sadurniño,2.822',
'Santa Comba,9.426',
'Santiago de Compostela,97.260',
'Santiso,1.584',
'Sobrado (A Coruña),1.758',
'Teo,18.579',
'Toques,1.124',
'Tordoia,3.299',
'Touro,3.574',
'Trazo,3.113',
'Val do Dubra,3.876',
'Valdoviño,6.563',
'Vedra,5.036',
'Vilarmaior,1.226',
'Vilasantar,1.213',
'Vimianzo,7.057',
'Zas,4.472'
]; // Búsquedas en formato "nombreMunicipio,poblacion"
const searchEngineChoice = 1; // 1 para Google, 2 para Bing, 3 para DuckDuckGo
const excludedKeywords = ["sede"]; // Palabras clave a excluir en los dominios
const outputFileName = './FICHEROS TEMPORALES/DOMINIOS.csv'; // Nombre del archivo de salida

// Función principal para realizar búsquedas
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

    for (const entry of entries) {
        const [municipio, poblacion] = entry.split(',');
        const searchQuery = `${prefix}${municipio}`;
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
                    results[municipio] = { url: firstResultUrl, poblacion };
                } else {
                    console.log(`No se encontró un resultado adecuado para "${searchQuery}"`);
                    results[municipio] = { url: 'No se encontró un resultado adecuado', poblacion };
                }
            } else {
                console.log(`Campo de búsqueda no encontrado para "${searchQuery}" en ${baseUrl}`);
                results[municipio] = { url: 'Campo de búsqueda no encontrado', poblacion };
            }
        } catch (error) {
            console.log(`Error al buscar "${searchQuery}" en ${baseUrl}: ${error.message}`);
            results[municipio] = { url: 'Error en la búsqueda', poblacion };
        }
    }

    await browser.close();
    return results;
}

// Ejemplo de uso
(async () => {
    const searchResults = await searchGoogleBingDuck(searchEntries);

    console.log("\nResultados:");
    let output = 'municipio,poblacion,dominio\n'; // Encabezado del archivo CSV
    for (const [municipio, data] of Object.entries(searchResults)) {
        const { url, poblacion } = data;
        console.log(`${municipio},${poblacion},${url}`);
        output += `${municipio},${poblacion},${url}\n`;
    }

    // Guardar los resultados en un archivo
    fs.writeFileSync(outputFileName, output);
    console.log(`\nResultados guardados en ${outputFileName}`);
})();
