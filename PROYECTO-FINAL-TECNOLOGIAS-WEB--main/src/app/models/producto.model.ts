export interface Producto {
  id: number;
  nombre: string;
  descripcion: string;
  precio: number;
  imagen: string;
  categoria: 'proteina' | 'creatina' | 'preentreno' | 'accesorio' | 'ropa';
}


export interface Proteina {
  id: number;
  nombre: string;
  descripcion: string;
  precio: number;
  imagen: string;
  // si quieres, puedes agregar categoria fija para cada tipo
  categoria: 'proteina';
}

export interface Creatina {
  id: number;
  nombre: string;
  descripcion: string;
  precio: number;
  imagen: string;
  categoria: 'creatina';
}

// puedes hacer lo mismo con otros tipos
export interface Preentreno {
  id: number;
  nombre: string;
  descripcion: string;
  precio: number;
  imagen: string;
  categoria: 'preentreno';
}

export interface Accesorio {
  id: number;
  nombre: string;
  descripcion: string;
  precio: number;
  imagen: string;
  categoria: 'accesorio';
}

export interface Ropa {
  id: number;
  nombre: string;
  descripcion: string;
  precio: number;
  imagen: string;
  categoria: 'ropa';
}
