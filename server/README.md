# Servidor (VPS Oracle, `ssh oracle`)

nginx em contêiner Docker (`retro-nginx`, porta 8088), ao lado do Caddy que já ocupa 80/443. Layout em `/srv/retro`:

```
cores/snes.js          npm run core:build → dist/cores/snes.js
roms/snes/             ROMs (.sfc/.smc/.fig; .zip é extraído pelo catálogo)
covers/snes/           gerado
catalog/snes.json      gerado
saves/snes/            gravado pela TV (PUT); dono uid 101 (nginx do contêiner)
```

Na VPS: `~/retro/` tem `catalog.py`, `nginx.conf.template`, `retro.conf` (gerado) e `token` (600); `~/libretro-database/` só os 4 `.dat` usados.

## Instalação (uma vez)

```sh
sudo mkdir -p /srv/retro/{cores,roms/snes,saves} && sudo chown -R ubuntu:ubuntu /srv/retro && sudo chown 101:101 /srv/retro/saves

mkdir -p ~/libretro-database && cd ~/libretro-database
SYS="Nintendo - Super Nintendo Entertainment System"
for d in no-intro releaseyear genre maxusers; do
  mkdir -p "metadat/$d"
  curl -sfL -o "metadat/$d/$SYS.dat" "https://raw.githubusercontent.com/libretro/libretro-database/master/metadat/$d/$(echo "$SYS" | sed 's/ /%20/g').dat"
done

cd ~/retro && (umask 077; openssl rand -hex 16 > token)
sed -e "s/__TOKEN__/$(cat token)/g" -e "s#__ROOT__#/srv/retro#g" nginx.conf.template > retro.conf
sudo docker run -d --name retro-nginx --restart unless-stopped -p 8088:8088 \
  -v /srv/retro:/srv/retro -v $HOME/retro/retro.conf:/etc/nginx/conf.d/default.conf:ro nginx:1.27-alpine

# porta 8088: firewall da VPS E Security List da Oracle (Ingress TCP 8088)
sudo iptables -I INPUT 6 -p tcp -m tcp --dport 8088 -m state --state NEW -j ACCEPT && sudo netfilter-persistent save
```

No app: `.env` com `SERVER=http://<ip>:8088/<token>/`.

## Adicionar jogos

```sh
rsync -a --exclude '*Zone.Identifier' roms/snes/ oracle:/srv/retro/roms/snes/
ssh oracle "python3 ~/retro/catalog.py /srv/retro snes ~/libretro-database"
```

A saída lista cada jogo; `SEM DADOS` = não achou no banco (ROM traduzida/hack): entra com o nome do arquivo e sem capa.

## Atualizar o emulador

```sh
npm run core:build && scp dist/cores/snes.js oracle:/srv/retro/cores/
```

## Conferir

```sh
curl -I http://<ip>:8088/<token>/catalog/snes.json   # 200
curl -I http://<ip>:8088/catalog/snes.json           # 404
```
