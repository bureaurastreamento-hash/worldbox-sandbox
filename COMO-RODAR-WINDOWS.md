# Como rodar no Windows

Guia passo a passo pra rodar esse projeto no seu PC. Leva uns 10 minutos na primeira vez e depois é só um comando.

> **Aviso importante:** não adianta extrair a pasta e dar dois cliques no `index.html`. O navegador bloqueia o carregamento dos módulos JavaScript quando o arquivo é aberto direto do disco. Você precisa servir a pasta, que é o que os passos abaixo fazem.

---

## Passo 1: instalar o Git

Baixe em https://git-scm.com/downloads/win e instale clicando em "Next" em tudo. As opções padrão estão certas.

## Passo 2: instalar o Python

Você tem duas opções:

**Microsoft Store (mais fácil):** abra a Store, pesquise por "Python 3", instale a versão mais recente.

**Site oficial:** baixe em https://www.python.org/downloads/ e, na primeira tela do instalador, **marque a caixinha "Add Python to PATH"** antes de clicar em Install. Se esquecer disso, o comando não vai funcionar depois.

## Passo 3: abrir o terminal na pasta certa

Escolha onde quer guardar o projeto, por exemplo `Documentos`. Abra essa pasta no Explorador de Arquivos, clique com o botão direito em um espaço vazio e escolha **"Abrir no Terminal"**.

No Windows 10, se essa opção não aparecer, clique com Shift + botão direito e escolha "Abrir janela do PowerShell aqui".

## Passo 4: baixar o projeto

Cole no terminal (troque `USUARIO` e `NOME-DO-REPO` pelos valores reais do link que te mandaram):

```
git clone https://github.com/USUARIO/NOME-DO-REPO
```

Depois entre na pasta que foi criada:

```
cd NOME-DO-REPO
```

## Passo 5: ligar o servidor

```
python -m http.server 8000
```

Se aparecer a Microsoft Store ou uma mensagem de comando não encontrado, tente:

```
py -m http.server 8000
```

Quando funcionar, o terminal vai mostrar algo como `Serving HTTP on :: port 8000`. **Deixe essa janela aberta.** É ela que está rodando o servidor.

## Passo 6: abrir o jogo

No navegador, acesse:

```
http://localhost:8000
```

Pronto. Pra encerrar, volte no terminal e aperte `Ctrl + C`.

---

## Nas próximas vezes

Abra o terminal na pasta do projeto e rode:

```
git pull
python -m http.server 8000
```

O `git pull` baixa as atualizações mais recentes. Faça isso sempre antes de jogar, pra pegar as novidades.

---

## Se der problema

**"git não é reconhecido como um comando"**
O Git não foi instalado ou o terminal foi aberto antes da instalação terminar. Feche o terminal, abra de novo e tente outra vez.

**O comando `python` abre a Microsoft Store**
O Windows tem um atalho falso do Python. Use `py -m http.server 8000` ou instale o Python de verdade pelo Passo 2.

**"Address already in use" ou a porta está ocupada**
Alguma coisa já está usando a porta 8000. Troque o número:
```
python -m http.server 8001
```
E acesse `http://localhost:8001`.

**A página abre em branco**
Confirme que você está na pasta certa. Rode `dir` no terminal: o `index.html` tem que aparecer na lista. Se não aparecer, você está uma pasta acima ou abaixo do lugar certo.

**Não quero instalar o Git**
Dá pra baixar sem ele: na página do projeto no GitHub, clique no botão verde **Code** e depois em **Download ZIP**. Extraia, abra o terminal dentro da pasta extraída e siga do Passo 5 em diante. A desvantagem é que pra atualizar você vai ter que baixar o ZIP de novo toda vez, em vez de rodar `git pull`.

**Já tenho Node.js instalado**
Então pode pular o Python e usar:
```
npx serve
```
Ele mostra na tela qual endereço abrir.
