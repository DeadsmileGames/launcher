# Build do launcher

Coloque esta pasta `.github` na raiz do repositório do launcher, ao lado de `package.json`, `package-lock.json`, `electron`, `src`, `public`, `build` e `scripts`. O workflow usa os comandos da versão 1.7.1 do projeto.

No GitHub, abra **Actions → Build Deadsmile Games Launcher → Run workflow**. Escolha `installer` para gerar o instalador Windows x64 ou `store` para gerar o pacote MSIX x64. Ao terminar, baixe o arquivo na seção **Artifacts** da execução. Pushes nas branches `main` e `master` também geram o instalador.

Para `store`, cadastre em **Settings → Secrets and variables → Actions → Variables** estes valores, copiados da identidade do aplicativo no Microsoft Partner Center:

- `MICROSOFT_STORE_IDENTITY_NAME`: Package/Identity/Name.
- `MICROSOFT_STORE_PUBLISHER`: Package/Identity/Publisher, incluindo `CN=`.
- `MICROSOFT_STORE_PUBLISHER_DISPLAY_NAME`: nome de exibição do publicador.

O pacote MSIX é validado pelo script existente e destinado ao envio para a Microsoft Store, que realiza sua assinatura. O instalador EXE não recebe assinatura de produção neste workflow. Nenhum pacote é publicado automaticamente.

A sintaxe do workflow e seus comandos foram conferidos com os scripts locais. A execução do empacotamento Windows precisa acontecer no runner do GitHub; ela não foi executada neste ambiente.
