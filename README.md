# Beca CIN htmlcsToJSON
## Descripción
Este paquete es un aplicación simple que envuelve a la herramienta de prueba de accesibilidad [HTML Code Sniffer](https://github.com/squizlabs/HTML_CodeSniffer).

## Instalación
Para la instalación utilizar el comando:

```bash
$ npm install -g https://github.com/nicostreri/Beca-CIN-htmlcsToJSON
```

o clonando este repositorio:

```bash
$ git clone https://github.com/nicostreri/Beca-CIN-htmlcsToJSON
$ cd Beca-CIN-htmlcsToJSON
$ npm link
```

## Uso
Luego de la instalación se encuentra disponible de forma global en su sistema el comando `htmlcsToJSON`. Utilizar de la siguiente manera:

```bash
$ htmlcsToJSON --url https://google.com.ar
```

Además, se puede especificar el standard a ser analizado usando `--standard`:

```bash
$ htmlcsToJSON -u https://google.com.ar --standard WCAG2AAA
```

Esto imprime por consola el resultado del análisis de accesibilidad en formato JSON:
```json
{
    "status":"ok",
    "results":[
        {
            "type":3,
            "element":"website",
            "msg":"Check that the title element describes the document.",
            "code":"WCAG2AAA.Principle2.Guideline2_4.2_4_2.H25.2"
        }
    ]
}
```

## ¿Por qué esta aplicación?
La herramienta de accesibilidad HTML CodeSniffer está construida como una librería JavaScript que debe ser importada usando la etiqueta `<script>` y requiere del renderizado de un navegador.

Esta aplicación utiliza el API ofrecida por **puppeteer** para montar un navegador web, renderizar el sitio web a probar, inyectar HTMLCodeSniffer y ejecutarlo.