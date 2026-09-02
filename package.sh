pnpm run build
mkdir -p /tmp/stream-koda/dist
cp main.py plugin.json package.json /tmp/stream-koda/
cp dist/index.js /tmp/stream-koda/dist/
cd /tmp && zip -r stream-koda.zip stream-koda
mv stream-koda.zip ~/Downloads/stream-koda.zip
