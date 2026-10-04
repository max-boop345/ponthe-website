#!/bin/sh -e

# Aller dans le dossier de l'app
cd /app

# Installer les dépendances
/usr/local/bin/npm install

# Compiler les fichiers avec webpack
npx webpack --env --mode production

# Vérifier que les bundles ont été générés
echo "===> Bundles générés dans /react/"
ls -lh /react/

# Copier les bundles dans le back
echo "===> Copie des bundles dans /src/galerie/static/react/"
cp -v /react/*.bundle.js /src/galerie/static/react/ || echo "⚠️ Aucun bundle trouvé à copier"

