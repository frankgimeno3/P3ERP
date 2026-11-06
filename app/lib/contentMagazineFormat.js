export const contentMagazineFormats = [
 {value:'impreso_digital',label:'Impreso + digital'},
 {value:'impreso',label:'Impreso'},
 {value:'digital',label:'Digital'},
];
export function validateContentMagazineFormat(value) {
 if(!contentMagazineFormats.some(item=>item.value===value))throw Object.assign(new Error('Selecciona impreso, digital o impreso + digital.'),{statusCode:400,status:400});
 return value;
}
export const contentMagazineFormatLabel = row => contentMagazineFormats.find(item=>item.value===row.formato_revista)?.label || 'Impreso + digital';
