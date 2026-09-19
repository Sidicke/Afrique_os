const fs = require('fs');

let header = fs.readFileSync('src/components/dashboard/overview/WelcomeHeader.tsx', 'utf8');

const oldContext = `  // Phrase de contexte — hiérarchie : action > vigilance > dynamique positive.
  let context: string;
  if (toDoOrders > 0 && attentionProducts > 0) {
    context = \`\${toDoOrders} commande\${toDoOrders > 1 ? "s" : ""} à préparer et \${attentionProducts} produit\${attentionProducts > 1 ? "s" : ""} à surveiller.\`;
  } else if (toDoOrders > 0) {
    context = \`\${toDoOrders} commande\${toDoOrders > 1 ? "s" : ""} à préparer.\`;
  } else if (attentionProducts > 0) {
    context = \`\${attentionProducts} produit\${attentionProducts > 1 ? "s" : ""} nécessite\${attentionProducts > 1 ? "nt" : ""} votre attention.\`;
  } else if (isGrowing) {
    context = \`Votre chiffre d'affaires progresse de \${growth.toLocaleString("fr-FR")}%, une belle dynamique.\`;
  } else {
    context = \`Votre boutique se porte bien, aucune action urgente aujourd'hui.\`;
  }`;

const newContext = `  // Phrase de contexte — chaleureuse et captivante
  let context: string;
  if (toDoOrders > 0 && attentionProducts > 0) {
    context = \`De belles opportunités s'offrent à vous : vous avez \${toDoOrders} commande\${toDoOrders > 1 ? "s" : ""} impatiente\${toDoOrders > 1 ? "s" : ""} d'être expédiée\${toDoOrders > 1 ? "s" : ""} et \${attentionProducts} produit\${attentionProducts > 1 ? "s" : ""} victime\${attentionProducts > 1 ? "s" : ""} de son succès à surveiller.\`;
  } else if (toDoOrders > 0) {
    context = \`Excellente journée en perspective ! Vous avez \${toDoOrders} nouvelle\${toDoOrders > 1 ? "s" : ""} commande\${toDoOrders > 1 ? "s" : ""} qui n'attend\${toDoOrders > 1 ? "ent" : ""} que vous.\`;
  } else if (attentionProducts > 0) {
    context = \`Vos articles s'arrachent ! Pensez à réapprovisionner \${attentionProducts} produit\${attentionProducts > 1 ? "s" : ""} qui approche\${attentionProducts > 1 ? "nt" : ""} de la rupture de stock.\`;
  } else if (isGrowing) {
    context = \`Félicitations pour cette belle dynamique ! Votre chiffre d'affaires est en croissance de \${growth.toLocaleString("fr-FR")}%. Continuez sur cette lancée.\`;
  } else {
    context = \`C'est le moment idéal pour chouchouter votre vitrine et séduire de nouveaux clients ! Prenez le temps de revoir vos offres du moment.\`;
  }`;

header = header.replace(oldContext, newContext);
fs.writeFileSync('src/components/dashboard/overview/WelcomeHeader.tsx', header);
