const puppeteer = require('puppeteer');
const fs = require('fs');

// Configuración de los dominios y la profundidad de rastreo
const domains = [
  'A Baña,https://www.concellodabana.gal/index.php/es/',
  'Abegondo,https://abegondo.gal/',
  'A Capela,https://concellodacapela.es/'
];
const maxDepth = 2; // Configura la profundidad máxima
const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,7}\b/g;
const outputFile = './FICHEROS TEMPORALES/RESULTADOS.txt';
const csvFile = './FICHEROS TEMPORALES/EMAILS.csv';

// Variables constantes de Comunidad y Provincia
const comunidad = 'Galicia'; // Especifica aquí el valor de comunidad
const provincia = 'La Coruña'; // Especifica aquí el valor de provincia

// Función para escribir en el archivo de texto
function writeToFile(content) {
    fs.appendFileSync(outputFile, content + '\n', (err) => {
        if (err) console.error("Error al escribir en el archivo:", err);
    });
}

// Función para escribir en el archivo CSV
function writeToCSV(line) {
    fs.appendFileSync(csvFile, line + '\n', (err) => {
        if (err) console.error("Error al escribir en el archivo CSV:", err);
    });
}

// Función principal del rastreador
async function scrapePage(url, domain, depth, visited = new Set()) {
    if (depth > maxDepth || visited.has(url)) return []; // Limitar la profundidad o si ya visitamos la URL

    console.log(`Visitando: ${url} (Profundidad: ${depth})`);
    visited.add(url);

    const emails = new Set();
    const newUrls = new Set();
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    try {
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
        const content = await page.content();
        const foundEmails = content.match(emailRegex);
        if (foundEmails) foundEmails.forEach(email => emails.add(email));

        const hrefs = await page.$$eval('a', links => links.map(link => link.href));
        hrefs.forEach(href => {
            if (href.startsWith(domain) && !visited.has(href)) {
                newUrls.add(href);
            }
        });
    } catch (error) {
        console.error(`Error al acceder a ${url}:`, error);
        writeToFile(`Error al acceder a ${url}: ${error.message}`);
    } finally {
        await browser.close();
    }

    for (let newUrl of newUrls) {
        const subEmails = await scrapePage(newUrl, domain, depth + 1, visited);
        subEmails.forEach(email => emails.add(email));
    }

    return Array.from(emails);
}

// Función para procesar múltiples dominios
async function processDomains(domains) {
    for (const entry of domains) {
        // Separar municipio y dominio del CSV
        const [municipio, domain] = entry.split(',');

        writeToFile(`Resultados para ${municipio}, ${domain}:\n`);
        console.log(`Iniciando rastreo para el dominio: ${domain}`);
        
        try {
            const emails = await scrapePage(domain, domain, 0);
            if (emails.length > 0) {
                emails.forEach(email => {
                    console.log(email);
                    writeToFile(email);
                    writeToCSV(`${comunidad},${provincia},${municipio},${domain},${email}`);
                });
            } else {
                console.log(`No se encontraron correos electrónicos en ${domain}`);
                writeToFile(`No se encontraron correos electrónicos en ${domain}`);
            }
        } catch (error) {
            console.error(`Error en el dominio ${domain}:`, error);
            writeToFile(`Error en el dominio ${domain}: ${error.message}`);
        }

        writeToFile(`\n----------------------------------------\n`);
    }
}

// Ejecutar el rastreador para múltiples dominios
(async () => {
    fs.writeFileSync(outputFile, ''); // Limpiar el archivo de texto al iniciar
    fs.writeFileSync(csvFile, 'comunidad,provincia,municipio,dominio,email\n'); // Cabecera del archivo CSV
    await processDomains(domains);
    console.log(`Rastreo completado. Revisa los resultados en ${outputFile} y en ${csvFile}`);
})();
