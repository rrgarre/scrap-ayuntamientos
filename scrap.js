const puppeteer = require('puppeteer');
const fs = require('fs');

// Configuración de archivos
const inputFile = './FICHEROS ENTRADA/entradaScrap'; // Archivo de entrada
const outputFile = './FICHEROS SALIDA/RESULTADOS.txt'; // Archivo de texto para los resultados
const csvFile = './FICHEROS SALIDA/EMAILS.csv'; // Archivo CSV para los resultados

// Configuración de rastreo
const maxDepth = 2; // Configura la profundidad máxima
const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,7}\b/g;

// Variables constantes de Comunidad y Provincia
const comunidad = 'Galicia'; // Especifica aquí el valor de comunidad
const provincia = 'La Coruña'; // Especifica aquí el valor de provincia

// Leer el archivo de entrada
function readInputFile(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        return content
            .split('\n')
            .map(line => line.trim())
            .filter(line => line !== '' && !line.startsWith('#')); // Ignorar líneas vacías o comentarios
    } catch (error) {
        console.error(`Error al leer el archivo de entrada: ${error.message}`);
        process.exit(1);
    }
}

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
    // const browser = await puppeteer.launch(); 
    const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] }); // Para problemas en Linux
    const page = await browser.newPage();

    try {
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 6000 });
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
        // Separar municipio, población y dominio del CSV
        const [municipio, poblacion, domain] = entry.split(',');

        writeToFile(`Resultados para ${municipio}, ${domain}:\n`);
        console.log(`Iniciando rastreo para el dominio: ${domain}`);
        
        try {
            const emails = await scrapePage(domain, domain, 0);
            if (emails.length > 0) {
                emails.forEach(email => {
                    console.log(email);
                    writeToFile(email);
                    writeToCSV(`${comunidad},${provincia},${municipio},${domain},${poblacion},${email}`);
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
    const domains = readInputFile(inputFile); // Leer dominios desde el archivo
    fs.writeFileSync(outputFile, ''); // Limpiar el archivo de texto al iniciar
    fs.writeFileSync(csvFile, 'comunidad,provincia,municipio,dominio,poblacion,email\n'); // Cabecera del archivo CSV
    await processDomains(domains);
    console.log(`Rastreo completado. Revisa los resultados en ${outputFile} y en ${csvFile}`);
})();
