import { ContenedorMongoDB } from "../contenedores/ContenedorMongoDB.js";
import { ModeloMensajes } from "../models/mensajes.js";

export class MensajesDaoMongoDB extends ContenedorMongoDB {
  constructor() {
    super({
      name: 'mensajes',
      schema: ModeloMensajes.MensajesSchema,
    });
  }
}

export default MensajesDaoMongoDB;