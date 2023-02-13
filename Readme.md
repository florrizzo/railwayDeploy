![consigna1.png](https://github.com/florrizzo/curso-back-end-2.0/blob/master/Desafio14_LoggersGzipYAnalisisDePerformance/imagenesReadme/consigna1.png)

![consigna2.png](https://github.com/florrizzo/curso-back-end-2.0/blob/master/Desafio14_LoggersGzipYAnalisisDePerformance/imagenesReadme/consigna2.png)

![compresiongzip.jpg](https://github.com/florrizzo/curso-back-end-2.0/blob/master/Desafio14_LoggersGzipYAnalisisDePerformance/imagenesReadme/compresiongzip.jpg)

La cantidad de bytes transferidos sin compresión es de 682 B, y con compresión es de 537 B. Es decir, existe una diferencia de 145 B

![consigna3.png](https://github.com/florrizzo/curso-back-end-2.0/blob/master/Desafio14_LoggersGzipYAnalisisDePerformance/imagenesReadme/consigna3.png)

Ver los archivos warn.log e info.log

![consigna4.png](https://github.com/florrizzo/curso-back-end-2.0/blob/master/Desafio14_LoggersGzipYAnalisisDePerformance/imagenesReadme/consigna4.png)

Con los console.log de la ruta /info comentados, ejecutar los siguientes comandos:

node --prof server.js 8081 FORK

(En otra terminal)

artillery quick --count 50 -n 20 http://localhost:8081/info > artillery_sincl.txt

Apagar el servidor, cambiar el nombre del archivo "isolate..." a "prof_sincl.log" y ejecutar

node --prof-process sincl.log >prof_sincl.txt 

Con los console.log de la ruta /info descomentados, repetir los comandos:

node --prof server.js 8081 FORK

(En otra terminal)

artillery quick --count 50 -n 20 http://localhost:8081/info > artillery_concl.txt

Apagar el servidor, cambiar el nombre del archivo "isolate..." a "prof_concl.log" y ejecutar

node --prof-process sincl.log >prof_concl.txt 

Ver la carpeta "analisisPerformance/--prof" para ver estos archivos.

![artillery.png](https://github.com/florrizzo/curso-back-end-2.0/blob/master/Desafio14_LoggersGzipYAnalisisDePerformance/imagenesReadme/artillery.png)

Se puede ver que con los console.logs realiza menos requests por segundo (43/seg) y tiene una media (214.9) más alta que sin los console.logs (66/seg, y 138.4)

![--prof.png](https://github.com/florrizzo/curso-back-end-2.0/blob/master/Desafio14_LoggersGzipYAnalisisDePerformance/imagenesReadme/--prof.png)

Podemos ver que en Shared libraries el proceso con console.log lleva muchos mas ticks que el proceso sin los console.log.

![consigna5.png](https://github.com/florrizzo/curso-back-end-2.0/blob/master/Desafio14_LoggersGzipYAnalisisDePerformance/imagenesReadme/consigna5.png)

Para ambos casos (console.log comentado y descomentado) ejecutamos

node --inspect server.js

Y en otra terminal

artillery quick --count 50 -n 20 http://localhost:8081/info > inspectSinCL.txt

Ver la carpeta "analisisPerformance/--inspect" para ver estos archivos.

Sin console.log:
![inspectSinCL.png](https://github.com/florrizzo/curso-back-end-2.0/blob/master/Desafio14_LoggersGzipYAnalisisDePerformance/imagenesReadme/inspectSinCL.png)


Con console.log:
![inspectConCL.png](https://github.com/florrizzo/curso-back-end-2.0/blob/master/Desafio14_LoggersGzipYAnalisisDePerformance/imagenesReadme/inspectConCL.png)

En la lista de procesos se ve que el que más tiempo requiere es "consoleCall". Viendo el código:

![inspectConCLcodigo.png](https://github.com/florrizzo/curso-back-end-2.0/blob/master/Desafio14_LoggersGzipYAnalisisDePerformance/imagenesReadme/inspectConCLcodigo.png)


![consigna6.png](https://github.com/florrizzo/curso-back-end-2.0/blob/master/Desafio14_LoggersGzipYAnalisisDePerformance/imagenesReadme/consigna6.png)

Para ambos casos (console.log comentado y descomentado) ejecutamos

npm start

Y en otra terminal

npm test

Apagar el servidor

Ver la carpeta "analisisPerformance/autocannon" para ver estos archivos.

![autocannonCMD.png](https://github.com/florrizzo/curso-back-end-2.0/blob/master/Desafio14_LoggersGzipYAnalisisDePerformance/imagenesReadme/autocannonCMD.png)

![autocannonConCL.png](https://github.com/florrizzo/curso-back-end-2.0/blob/master/Desafio14_LoggersGzipYAnalisisDePerformance/imagenesReadme/autocannonConCL.png)

![autocannonSinCL.png](https://github.com/florrizzo/curso-back-end-2.0/blob/master/Desafio14_LoggersGzipYAnalisisDePerformance/imagenesReadme/autocannonSinCL.png)


En general se puede observar que el código con console.log requiere muchos más procesos que si no los tiene.