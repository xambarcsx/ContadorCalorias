'use strict';

/* Base de alimentos. Valores aproximados por cada 100 g (USDA / tablas comunes).
   n: nombre, cat: categoría, k: kcal, p: proteína, c: carbohidratos, f: grasa,
   por: porción típica [etiqueta, gramos] (opcional). */
const FOODS = [
  // Proteínas
  { n: 'Pechuga de pollo (cocida)', cat: 'Proteínas', k: 165, p: 31, c: 0, f: 3.6, por: ['filete', 150] },
  { n: 'Muslo de pollo sin piel (cocido)', cat: 'Proteínas', k: 209, p: 26, c: 0, f: 10.9, por: ['pieza', 100] },
  { n: 'Carne de res magra (cocida)', cat: 'Proteínas', k: 217, p: 26, c: 0, f: 12, por: ['bistec', 150] },
  { n: 'Carne molida 85/15 (cocida)', cat: 'Proteínas', k: 250, p: 26, c: 0, f: 15 },
  { n: 'Lomo de cerdo (cocido)', cat: 'Proteínas', k: 143, p: 26, c: 0, f: 3.5, por: ['filete', 150] },
  { n: 'Atún en agua (lata, escurrido)', cat: 'Proteínas', k: 116, p: 26, c: 0, f: 0.8, por: ['lata', 120] },
  { n: 'Salmón (cocido)', cat: 'Proteínas', k: 206, p: 22, c: 0, f: 12, por: ['filete', 150] },
  { n: 'Tilapia (cocida)', cat: 'Proteínas', k: 128, p: 26, c: 0, f: 2.7, por: ['filete', 120] },
  { n: 'Camarón (cocido)', cat: 'Proteínas', k: 99, p: 24, c: 0.2, f: 0.3 },
  { n: 'Huevo entero', cat: 'Proteínas', k: 143, p: 12.6, c: 0.7, f: 9.5, por: ['pieza', 50] },
  { n: 'Clara de huevo', cat: 'Proteínas', k: 52, p: 10.9, c: 0.7, f: 0.2, por: ['clara', 33] },
  { n: 'Jamón de pavo', cat: 'Proteínas', k: 104, p: 17, c: 2, f: 3, por: ['rebanada', 20] },
  { n: 'Queso panela', cat: 'Lácteos', k: 245, p: 18, c: 3, f: 18, por: ['rebanada', 30] },
  { n: 'Queso Oaxaca', cat: 'Lácteos', k: 300, p: 22, c: 2, f: 22, por: ['porción', 30] },
  { n: 'Queso cottage', cat: 'Lácteos', k: 98, p: 11, c: 3.4, f: 4.3, por: ['taza', 225] },
  { n: 'Yogur griego natural 0%', cat: 'Lácteos', k: 59, p: 10, c: 3.6, f: 0.4, por: ['vaso', 150] },
  { n: 'Leche entera', cat: 'Lácteos', k: 61, p: 3.2, c: 4.8, f: 3.3, por: ['taza', 240] },
  { n: 'Leche descremada', cat: 'Lácteos', k: 34, p: 3.4, c: 5, f: 0.1, por: ['taza', 240] },
  { n: 'Proteína en polvo (whey)', cat: 'Proteínas', k: 400, p: 80, c: 8, f: 6, por: ['scoop', 30] },
  { n: 'Tofu firme', cat: 'Proteínas', k: 144, p: 17, c: 3, f: 9 },

  // Carbohidratos
  { n: 'Arroz blanco (cocido)', cat: 'Cereales y tubérculos', k: 130, p: 2.7, c: 28, f: 0.3, por: ['taza', 160] },
  { n: 'Arroz integral (cocido)', cat: 'Cereales y tubérculos', k: 123, p: 2.7, c: 25.6, f: 1, por: ['taza', 160] },
  { n: 'Avena en hojuelas (cruda)', cat: 'Cereales y tubérculos', k: 389, p: 16.9, c: 66, f: 6.9, por: ['1/2 taza', 40] },
  { n: 'Tortilla de maíz', cat: 'Cereales y tubérculos', k: 218, p: 5.7, c: 44.6, f: 2.9, por: ['pieza', 30] },
  { n: 'Tortilla de harina', cat: 'Cereales y tubérculos', k: 312, p: 8.3, c: 52, f: 8, por: ['pieza', 45] },
  { n: 'Pan blanco', cat: 'Cereales y tubérculos', k: 265, p: 9, c: 49, f: 3.2, por: ['rebanada', 28] },
  { n: 'Pan integral', cat: 'Cereales y tubérculos', k: 247, p: 13, c: 41, f: 3.4, por: ['rebanada', 32] },
  { n: 'Bolillo', cat: 'Cereales y tubérculos', k: 280, p: 9, c: 56, f: 2, por: ['pieza', 60] },
  { n: 'Pasta (cocida)', cat: 'Cereales y tubérculos', k: 158, p: 5.8, c: 31, f: 0.9, por: ['taza', 140] },
  { n: 'Papa (cocida)', cat: 'Cereales y tubérculos', k: 87, p: 1.9, c: 20, f: 0.1, por: ['pieza mediana', 170] },
  { n: 'Camote (cocido)', cat: 'Cereales y tubérculos', k: 90, p: 2, c: 20.7, f: 0.2, por: ['pieza', 150] },
  { n: 'Quinoa (cocida)', cat: 'Cereales y tubérculos', k: 120, p: 4.4, c: 21, f: 1.9, por: ['taza', 185] },
  { n: 'Elote / maíz', cat: 'Cereales y tubérculos', k: 96, p: 3.4, c: 21, f: 1.5, por: ['pieza', 100] },
  { n: 'Granola', cat: 'Cereales y tubérculos', k: 471, p: 10, c: 64, f: 20, por: ['1/4 taza', 30] },
  { n: 'Cereal de hojuelas de maíz', cat: 'Cereales y tubérculos', k: 357, p: 7.5, c: 84, f: 0.4, por: ['taza', 30] },

  // Leguminosas
  { n: 'Frijoles (cocidos)', cat: 'Leguminosas', k: 132, p: 8.9, c: 23.7, f: 0.5, por: ['taza', 170] },
  { n: 'Frijoles refritos', cat: 'Leguminosas', k: 160, p: 6, c: 18, f: 7, por: ['1/2 taza', 120] },
  { n: 'Lentejas (cocidas)', cat: 'Leguminosas', k: 116, p: 9, c: 20, f: 0.4, por: ['taza', 200] },
  { n: 'Garbanzos (cocidos)', cat: 'Leguminosas', k: 164, p: 8.9, c: 27, f: 2.6, por: ['taza', 165] },

  // Frutas
  { n: 'Plátano', cat: 'Frutas', k: 89, p: 1.1, c: 22.8, f: 0.3, por: ['pieza', 120] },
  { n: 'Manzana', cat: 'Frutas', k: 52, p: 0.3, c: 13.8, f: 0.2, por: ['pieza', 180] },
  { n: 'Naranja', cat: 'Frutas', k: 47, p: 0.9, c: 11.8, f: 0.1, por: ['pieza', 130] },
  { n: 'Fresas', cat: 'Frutas', k: 32, p: 0.7, c: 7.7, f: 0.3, por: ['taza', 150] },
  { n: 'Papaya', cat: 'Frutas', k: 43, p: 0.5, c: 10.8, f: 0.3, por: ['taza', 145] },
  { n: 'Mango', cat: 'Frutas', k: 60, p: 0.8, c: 15, f: 0.4, por: ['pieza', 200] },
  { n: 'Sandía', cat: 'Frutas', k: 30, p: 0.6, c: 7.6, f: 0.2, por: ['taza', 150] },
  { n: 'Uvas', cat: 'Frutas', k: 69, p: 0.7, c: 18, f: 0.2, por: ['taza', 150] },
  { n: 'Piña', cat: 'Frutas', k: 50, p: 0.5, c: 13, f: 0.1, por: ['taza', 165] },
  { n: 'Arándanos', cat: 'Frutas', k: 57, p: 0.7, c: 14.5, f: 0.3, por: ['taza', 150] },

  // Verduras
  { n: 'Brócoli', cat: 'Verduras', k: 34, p: 2.8, c: 7, f: 0.4, por: ['taza', 90] },
  { n: 'Espinaca', cat: 'Verduras', k: 23, p: 2.9, c: 3.6, f: 0.4, por: ['taza', 30] },
  { n: 'Lechuga', cat: 'Verduras', k: 15, p: 1.4, c: 2.9, f: 0.2, por: ['taza', 50] },
  { n: 'Jitomate', cat: 'Verduras', k: 18, p: 0.9, c: 3.9, f: 0.2, por: ['pieza', 120] },
  { n: 'Pepino', cat: 'Verduras', k: 15, p: 0.7, c: 3.6, f: 0.1, por: ['pieza', 200] },
  { n: 'Zanahoria', cat: 'Verduras', k: 41, p: 0.9, c: 9.6, f: 0.2, por: ['pieza', 70] },
  { n: 'Calabacita', cat: 'Verduras', k: 17, p: 1.2, c: 3.1, f: 0.3, por: ['pieza', 200] },
  { n: 'Nopales (cocidos)', cat: 'Verduras', k: 16, p: 1.3, c: 3.3, f: 0.1, por: ['taza', 150] },
  { n: 'Cebolla', cat: 'Verduras', k: 40, p: 1.1, c: 9.3, f: 0.1 },
  { n: 'Champiñones', cat: 'Verduras', k: 22, p: 3.1, c: 3.3, f: 0.3, por: ['taza', 70] },

  // Grasas
  { n: 'Aguacate', cat: 'Grasas', k: 160, p: 2, c: 8.5, f: 14.7, por: ['1/2 pieza', 70] },
  { n: 'Aceite de oliva', cat: 'Grasas', k: 884, p: 0, c: 0, f: 100, por: ['cucharada', 14] },
  { n: 'Aceite vegetal', cat: 'Grasas', k: 884, p: 0, c: 0, f: 100, por: ['cucharada', 14] },
  { n: 'Mantequilla', cat: 'Grasas', k: 717, p: 0.9, c: 0.1, f: 81, por: ['cucharada', 14] },
  { n: 'Crema de cacahuate', cat: 'Grasas', k: 588, p: 25, c: 20, f: 50, por: ['cucharada', 16] },
  { n: 'Almendras', cat: 'Grasas', k: 579, p: 21, c: 22, f: 50, por: ['puño', 28] },
  { n: 'Nueces', cat: 'Grasas', k: 654, p: 15, c: 14, f: 65, por: ['puño', 28] },
  { n: 'Cacahuates', cat: 'Grasas', k: 567, p: 26, c: 16, f: 49, por: ['puño', 28] },
  { n: 'Semillas de chía', cat: 'Grasas', k: 486, p: 17, c: 42, f: 31, por: ['cucharada', 12] },

  // Otros
  { n: 'Azúcar', cat: 'Otros', k: 387, p: 0, c: 100, f: 0, por: ['cucharadita', 4] },
  { n: 'Miel', cat: 'Otros', k: 304, p: 0.3, c: 82, f: 0, por: ['cucharada', 21] },
  { n: 'Chocolate oscuro 70%', cat: 'Otros', k: 598, p: 7.8, c: 46, f: 43, por: ['cuadrito', 10] },
  { n: 'Refresco de cola', cat: 'Bebidas', k: 42, p: 0, c: 10.6, f: 0, por: ['lata', 355] },
  { n: 'Jugo de naranja', cat: 'Bebidas', k: 45, p: 0.7, c: 10.4, f: 0.2, por: ['vaso', 250] },
  { n: 'Cerveza', cat: 'Bebidas', k: 43, p: 0.5, c: 3.6, f: 0, por: ['lata', 355] },
  { n: 'Papas fritas de bolsa', cat: 'Otros', k: 536, p: 7, c: 53, f: 35, por: ['bolsa chica', 45] },
  { n: 'Pizza (pepperoni)', cat: 'Platillos', k: 266, p: 11, c: 33, f: 10, por: ['rebanada', 107] },
  { n: 'Taco al pastor (aprox.)', cat: 'Platillos', k: 214, p: 12, c: 20, f: 10, por: ['taco', 70] },
  { n: 'Hamburguesa sencilla (aprox.)', cat: 'Platillos', k: 254, p: 13, c: 29, f: 9.5, por: ['pieza', 110] },
];

/* Ejercicios por patrón de movimiento, con variante según el equipo disponible.
   comp: ejercicio compuesto (multiarticular). */
const EXERCISES = {
  pecho:      { comp: true,  gym: 'Press de banca con barra',          manc: 'Press de banca con mancuernas',        casa: 'Lagartijas (flexiones)' },
  pechoInc:   { comp: true,  gym: 'Press inclinado con mancuernas',    manc: 'Press inclinado con mancuernas',       casa: 'Lagartijas con pies elevados' },
  pechoAisl:  { comp: false, gym: 'Aperturas en máquina (pec deck)',   manc: 'Aperturas con mancuernas',             casa: 'Lagartijas abiertas' },
  espVert:    { comp: true,  gym: 'Jalón al pecho en polea',           manc: 'Pullover con mancuerna',               casa: 'Dominadas (o asistidas con banda)' },
  espHoriz:   { comp: true,  gym: 'Remo con barra',                    manc: 'Remo con mancuerna a una mano',        casa: 'Remo invertido bajo una mesa' },
  espRemo2:   { comp: true,  gym: 'Remo sentado en polea',             manc: 'Remo con mancuernas en banco inclinado', casa: 'Remo con mochila' },
  hombro:     { comp: true,  gym: 'Press militar con barra',           manc: 'Press de hombro con mancuernas',       casa: 'Lagartijas pike' },
  hombroLat:  { comp: false, gym: 'Elevaciones laterales con mancuernas', manc: 'Elevaciones laterales con mancuernas', casa: 'Elevaciones laterales con banda o botellas' },
  hombroPost: { comp: false, gym: 'Face pull en polea',                manc: 'Pájaros con mancuernas',               casa: 'Y-T-W boca abajo' },
  biceps:     { comp: false, gym: 'Curl con barra',                    manc: 'Curl con mancuernas',                  casa: 'Curl con mochila o banda' },
  biceps2:    { comp: false, gym: 'Curl martillo con mancuernas',      manc: 'Curl martillo',                        casa: 'Curl martillo con banda' },
  triceps:    { comp: false, gym: 'Extensión de tríceps en polea',     manc: 'Extensión de tríceps sobre la cabeza', casa: 'Fondos en silla' },
  triceps2:   { comp: false, gym: 'Press francés con barra Z',         manc: 'Patada de tríceps',                    casa: 'Lagartijas diamante' },
  cuad:       { comp: true,  gym: 'Sentadilla con barra',              manc: 'Sentadilla goblet',                    casa: 'Sentadilla con mochila' },
  cuad2:      { comp: true,  gym: 'Prensa de piernas',                 manc: 'Zancadas con mancuernas',              casa: 'Zancadas caminando' },
  cuadAisl:   { comp: false, gym: 'Extensión de cuádriceps',           manc: 'Sentadilla búlgara',                   casa: 'Sentadilla búlgara' },
  isquio:     { comp: true,  gym: 'Peso muerto rumano con barra',      manc: 'Peso muerto rumano con mancuernas',    casa: 'Peso muerto a una pierna' },
  isquioAisl: { comp: false, gym: 'Curl femoral en máquina',           manc: 'Curl femoral con mancuerna',           casa: 'Curl nórdico asistido' },
  gluteo:     { comp: true,  gym: 'Hip thrust con barra',              manc: 'Hip thrust con mancuerna',             casa: 'Puente de glúteo a una pierna' },
  pantorrilla:{ comp: false, gym: 'Elevación de talones en máquina',   manc: 'Elevación de talones con mancuernas',  casa: 'Elevación de talones en escalón' },
  core:       { comp: false, gym: 'Crunch en polea',                   manc: 'Plancha',                              casa: 'Plancha' },
  core2:      { comp: false, gym: 'Elevación de piernas colgado',      manc: 'Elevación de piernas acostado',        casa: 'Elevación de piernas acostado' },
};

const DAY_TEMPLATES = {
  fullA:  { name: 'Cuerpo completo A', ex: ['cuad', 'pecho', 'espHoriz', 'hombro', 'isquio', 'core'] },
  fullB:  { name: 'Cuerpo completo B', ex: ['isquio', 'espVert', 'pechoInc', 'cuad2', 'hombroLat', 'biceps', 'triceps'] },
  fullC:  { name: 'Cuerpo completo C', ex: ['gluteo', 'cuad2', 'pecho', 'espRemo2', 'hombroPost', 'core2'] },
  upperA: { name: 'Torso A', ex: ['pecho', 'espHoriz', 'hombro', 'espVert', 'biceps', 'triceps'] },
  upperB: { name: 'Torso B', ex: ['pechoInc', 'espVert', 'espRemo2', 'hombroLat', 'biceps2', 'triceps2'] },
  lowerA: { name: 'Pierna A', ex: ['cuad', 'isquio', 'cuad2', 'isquioAisl', 'pantorrilla', 'core'] },
  lowerB: { name: 'Pierna B', ex: ['isquio', 'gluteo', 'cuadAisl', 'isquioAisl', 'pantorrilla', 'core2'] },
  push:   { name: 'Empuje (pecho, hombro, tríceps)', ex: ['pecho', 'pechoInc', 'hombro', 'hombroLat', 'triceps', 'triceps2'] },
  pull:   { name: 'Jalón (espalda, bíceps)', ex: ['espVert', 'espHoriz', 'espRemo2', 'hombroPost', 'biceps', 'biceps2'] },
  legs:   { name: 'Pierna completa', ex: ['cuad', 'isquio', 'cuad2', 'isquioAisl', 'gluteo', 'pantorrilla'] },
};

const SPLITS = {
  2: { name: 'Cuerpo completo (2 días)', days: ['fullA', 'fullB'], when: ['Lunes', 'Jueves'] },
  3: { name: 'Cuerpo completo (3 días)', days: ['fullA', 'fullB', 'fullC'], when: ['Lunes', 'Miércoles', 'Viernes'] },
  4: { name: 'Torso / Pierna', days: ['upperA', 'lowerA', 'upperB', 'lowerB'], when: ['Lunes', 'Martes', 'Jueves', 'Viernes'] },
  5: { name: 'Empuje / Jalón / Pierna + Torso / Pierna', days: ['push', 'pull', 'legs', 'upperA', 'lowerB'], when: ['Lunes', 'Martes', 'Miércoles', 'Viernes', 'Sábado'] },
  6: { name: 'Empuje / Jalón / Pierna ×2', days: ['push', 'pull', 'legs', 'push', 'pull', 'legs'], when: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'] },
};

const SCHEMES = {
  fuerza:      { comp: { s: 5, r: '3-5',   d: '3 min' }, acc: { s: 3, r: '6-8',   d: '2 min' } },
  hipertrofia: { comp: { s: 4, r: '6-10',  d: '2 min' }, acc: { s: 3, r: '10-15', d: '75 s' } },
  recomposicion: { comp: { s: 4, r: '6-10', d: '2 min' }, acc: { s: 3, r: '10-15', d: '60-75 s' } },
  definicion:  { comp: { s: 3, r: '8-12',  d: '90 s' },  acc: { s: 3, r: '12-15', d: '60 s' } },
};
