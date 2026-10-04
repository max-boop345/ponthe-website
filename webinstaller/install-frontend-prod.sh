#!/bin/sh -e

# Aller dans le dossier de l'app
cd /app

# Installer les dépendances
/usr/local/bin/npm install

# Compiler les fichiers avec webpack
npx webpack --mode production

# Vérifier que les bundles ont été générés
echo "===> Bundles générés dans /react/"
ls -lh /react/
