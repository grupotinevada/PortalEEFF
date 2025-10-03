/*=============================================IMPORTANTE =================================================================================================
ESTA ES LA LOGICA DE FLUJO DEL PATRON MVC, [Frontend] → [Routes] → [Controller] → [Service] → [Model] → [DB]
LAS RUTAS SON LOS ENDPOINT, LOS CONTROLADORES MANEJAN LA LOGICA DE NEGOCIO, LOS SERVICIOS SE COMUNICAN CON LOS MODELOS Y LOS MODELOS SON LOS QUE INTERACTUAN CON LA BASE DE DATOS.
LA BASE DE DATOS ES MYSQL, Y SE UTILIZA EL PATRON DE DISEÑO MVC (Modelo-Vista-Controlador) PARA SEPARAR LA LOGICA DE NEGOCIO DE LA PRESENTACION.
===========================================================================================================================================================**/ 

const app = require('./backend/app');
const PORT = 3000;
const IP = '0.0.0.0'
app.listen(PORT, IP,() => {
  console.log(`Servidor corriendo en http://${IP}:${PORT}`);
  console.log('Usuario de prueba: admin@inevada.com / admin123456');
});