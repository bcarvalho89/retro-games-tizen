# Servidor (VPS Oracle)

Só nginx servindo arquivos. Layout em `/srv/retro`:

```
cores/snes.js          npm run core:build → dist/cores/snes.js
roms/snes/             ROMs (.sfc/.smc/.fig; .zip é extraído pelo catálogo)
covers/snes/           gerado
catalog/snes.json      gerado
saves/snes/            gravado pela TV (PUT)
```

## Instalação (uma vez)

```sh
sudo apt install -y nginx python3
sudo mkdir -p /srv/retro/{cores,roms/snes,saves} && sudo chown -R $USER /srv/retro
sudo chown www-data /srv/retro/saves

# metadados (só os 4 .dat usados)
mkdir -p ~/libretro-database && cd ~/libretro-database
SYS="Nintendo - Super Nintendo Entertainment System"
for d in no-intro releaseyear genre maxusers; do
  mkdir -p "metadat/$d"
  curl -sfL -o "metadat/$d/$SYS.dat" "https://raw.githubusercontent.com/libretro/libretro-database/master/metadat/$d/$(echo "$SYS" | sed 's/ /%20/g').dat"
done

# nginx
TOKEN=$(openssl rand -hex 16); echo "$TOKEN"   # guarde: vai no .env do app
sed -e "s/__TOKEN__/$TOKEN/g" -e "s#__ROOT__#/srv/retro#g" nginx.conf.template | sudo tee /etc/nginx/sites-available/retro
sudo ln -s /etc/nginx/sites-available/retro /etc/nginx/sites-enabled/retro
sudo nginx -t && sudo systemctl reload nginx

# porta 8088: firewall da VPS E Security List da Oracle (Ingress TCP 8088)
sudo iptables -I INPUT -p tcp --dport 8088 -j ACCEPT && sudo netfilter-persistent save
```

## Adicionar jogos

```sh
rsync -av roms/snes/ vps:/srv/retro/roms/snes/
ssh vps 'python3 ~/retro/catalog.py /srv/retro snes ~/libretro-database'
```

A saída lista cada jogo; `SEM DADOS` = não achou no banco (ROM traduzida/hack): entra com o nome do arquivo e sem capa.

## Atualizar o emulador

```sh
npm run core:build && scp dist/cores/snes.js vps:/srv/retro/cores/
```

## Conferir

```sh
curl -I http://<vps>:8088/<TOKEN>/catalog/snes.json   # 200
curl -I http://<vps>:8088/catalog/snes.json           # 404
```
