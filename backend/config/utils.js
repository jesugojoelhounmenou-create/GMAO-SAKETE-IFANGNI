// Générer un matricule unique
export function generateMatricule(nom, prenom) {
    const prefix = 'HZSI';
    const date = new Date();
    const annee = date.getFullYear();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    const nomCode = nom.substring(0, 3).toUpperCase();
    const prenomCode = prenom ? prenom.substring(0, 2).toUpperCase() : 'XX';
    return `${prefix}-${annee}-${nomCode}${prenomCode}-${random}`;
}