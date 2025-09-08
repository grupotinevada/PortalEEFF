Portal EEFF

Aplicación Angular para la gestión del portal financiero (Portal EEFF).  
Este proyecto está configurado para correr en un servidor con Node.js y exponerse mediante Apache/Nginx con Cloudflare Tunnel.

---

Requisitos previos

- Node.js 18+  
- Angular CLI  
- Servidor web (Apache o Nginx) configurado como proxy inverso  
- Acceso a Cloudflare (para crear el túnel hacia el servidor)  

---

Configuración del entorno

La aplicación depende del archivo environment.ts.  
Debe configurarse la URL de la API según el ambiente:

- Desarrollo  
  apiUrl: "https://portalfinanzasapitest.inevada.cl/api"

- Producción  
  apiUrl: "https://portalfinanzasapi.inevada.cl/api"

---

Build del proyecto

En la raíz del proyecto ejecutar:

ng build

Esto generará una carpeta dist/ en la raíz.  
Dentro de ella aparecerá un directorio llamado portaleeff (o similar).

---

Despliegue en el servidor

1. Copiar la carpeta portaleeff (generada en el build) a:  

   /var/www/

2. Entrar en la carpeta:

   cd /var/www/portaleeff/server

   Aquí se encuentran varios archivos, entre ellos el importante: server.mjs.

---

Ejecución del servidor

Ejecutar:

node server.mjs

Si todo está correcto, aparecerá el mensaje:

Node Express server listening on http://localhost:4003

Con esto, el servidor Angular ya está listo y escuchando peticiones en el puerto 4003.

---

Configuración de Proxy Inverso

El servidor Apache o Nginx debe configurarse como proxy inverso, apuntando a:  

http://{{IP_DEL_SERVIDOR}}:4003

De esta manera, el tráfico externo se redirige hacia la aplicación Angular en Node.

---

Integración con Cloudflare

1. Crear un túnel en Cloudflare.  
2. Configurar el túnel para que apunte a:  

   {{IP_DEL_SERVIDOR}}:4003

Con esto, la aplicación quedará expuesta bajo el dominio configurado en Cloudflare.

---

Resultado esperado

Una vez configurado todo el flujo (Node.js + Proxy inverso + Cloudflare Tunnel), podrás acceder al Portal EEFF desde tu dominio público.
