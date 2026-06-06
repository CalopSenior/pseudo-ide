# Pseudo-IDE — Referência da Linguagem

Ambiente educacional de pseudocódigo em Português. O pseudocódigo é transpilado para JavaScript e executado no navegador.

---

## Sumário

1. [Estrutura obrigatória](#estrutura)
2. [Tipos de variável](#tipos)
3. [Valores especiais](#valores-especiais)
4. [Operadores](#operadores)
5. [Entrada e Saída](#io)
6. [Controle de fluxo](#controle)
7. [Funções](#funcoes)
8. [Exceções](#excecoes)
9. [Marcadores de projeto](#marcadores)
10. [Bibliotecas nativas](#bibliotecas)
    - [mat](#mat)
    - [metodos](#metodos)
    - [tabular](#tabular)
    - [calculo](#calculo)
    - [estatistica](#estatistica)
    - [algebra](#algebra)
    - [tempo](#tempo)
    - [graficos](#graficos)
    - [probabilidade](#probabilidade)
11. [Editor](#editor)

---

## Estrutura obrigatória <a name="estrutura"></a>

Todo algoritmo deve ter um bloco raiz com nome seguido de `()`:

```
nomeDoAlgoritmo()
{
    // corpo principal
}
```

Sem esse wrapper, o código não executa.

---

## Tipos de variável <a name="tipos"></a>

| Tipo | Descrição | Exemplo |
|---|---|---|
| `inteiro` | Número sem parte decimal | `inteiro x = 10;` |
| `real` | Número com parte decimal | `real pi = 3.14;` |
| `caracter` | Texto (string) | `caracter nome = "Ana";` |
| `booleano` | Verdadeiro ou falso | `booleano ok = verdadeiro;` |
| `super` | Tipo universal (qualquer valor) | `super v = leia();` |

### Reatribuição

Uma variável já declarada pode ser reatribuída sem o tipo:

```
inteiro x = 5;
x = x + 1;
```

### Declarações tipadas em funções

```
funcao dobrar(inteiro(n > 0)) {
    retorno n * 2;
}
```

Restrições suportadas: `>`, `>=`, `<`, `<=`, `==`, `!=`. Valor padrão com `:`:

```
funcao saudar(caracter(nome) : "Mundo") {
    imprima(f"Olá, {nome}!");
}
```

---

## Valores especiais <a name="valores-especiais"></a>

| Valor | Significado |
|---|---|
| `verdadeiro` | Booleano true |
| `falso` | Booleano false |
| `vazio` | null — ausência de valor |
| `indefinido` | undefined — sem valor atribuído |
| `Infinito` | +∞ |
| `NegInfinito` | −∞ |

---

## Operadores <a name="operadores"></a>

| Categoria | Operadores |
|---|---|
| Aritméticos | `+`, `-`, `*`, `/`, `mod` (resto), `**` (potência) |
| Comparação | `==`, `!=`, `<`, `>`, `<=`, `>=` |
| Lógicos | `e` (AND), `ou` (OR), `nao` (NOT) |
| Acesso | `.` (método/propriedade), `[i]` (índice) |
| Texto | `*` com string repete: `"ab" * 3` → `"ababab"` |

### Strings interpoladas

Use o prefixo `f` para interpolar expressões com `{...}`:

```
real x = 3.14;
imprima(f"O valor de pi é {x}");
```

---

## Entrada e Saída <a name="io"></a>

```
imprima(valor1, valor2, ...);   // imprime no console (separa por espaço)
super entrada = leia("Texto:"); // lê do usuário (retorna número se possível)
```

`leia()` converte automaticamente para número se a entrada for numérica. Também reconhece `"Infinito"` e `"NegInfinito"`.

### Funções matemáticas nativas

| Função | Descrição |
|---|---|
| `raiz(x)` | √x — lança erro se x < 0 |
| `expo(x, y)` | x^y |
| `abs(x)` | \|x\| |
| `arred(x)` | Arredonda para inteiro mais próximo |
| `piso(x)` | ⌊x⌋ |
| `teto(x)` | ⌈x⌉ |
| `max(a, b)` | Maior dos dois |
| `min(a, b)` | Menor dos dois |
| `sen(x)` | Seno (radianos) |
| `cos(x)` | Cosseno |
| `tan(x)` | Tangente |
| `ln(x)` | Logaritmo natural |
| `log2(x)` | log₂(x) |
| `log10(x)` | log₁₀(x) |
| `aleatorio(a, b)` | Inteiro aleatório em [a, b] |

---

## Controle de fluxo <a name="controle"></a>

### Condicional

```
se (condição) {
    // ...
} senao se (outra) {
    // ...
} senao {
    // ...
}
```

### Enquanto (while)

```
enquanto (condição) {
    // ...
}
```

### Faca-enquanto (do-while)

```
faca {
    // ...
} enquanto (condição);
```

### Para (for clássico)

```
para (inteiro i = 0; i < 10; i++) {
    imprima(i);
}
```

### Para em (for-of)

```
para (item em lista) {
    imprima(item);
}
```

### Escolha (switch)

```
escolha (variavel) {
    caso 1:
        imprima("um");
        quebrar;
    caso 2:
        imprima("dois");
        quebrar;
    padrao:
        imprima("outro");
}
```

### Controle de laço

```
quebrar;    // break — sai do laço
continuar;  // continue — pula para próxima iteração
```

---

## Funções <a name="funcoes"></a>

```
funcao nome(parâmetros) {
    retorno valor;
}
```

Funções são hoisted — podem ser chamadas antes de serem definidas.

### Parâmetros tipados com restrição

```
funcao media(real(a), real(b)) {
    retorno (a + b) / 2;
}
```

### Valor padrão

```
funcao potencia(real(base), real(exp) : 2) {
    retorno expo(base, exp);
}
```

### Funções anônimas (arrow)

```
super dobrar = (x) => x * 2;
super resultado = dobrar(5);  // 10
```

### Funções de ordem superior

```
funcao aplicar(lista, fn) {
    para (item em lista) {
        imprima(fn(item));
    }
}
```

---

## Exceções <a name="excecoes"></a>

### Capturar erros

```
tentar {
    raiz(-1);
} capturar (e) {
    imprima(e.message);
}
```

### Lançar erros

```
lançar erro "Mensagem simples"

lançar erro("TypeError", "Descrição", valorRecebido, valorEsperado)
```

---

## Marcadores de projeto <a name="marcadores"></a>

Anotações no início do arquivo, ignoradas pelo compilador:

```
@NOME[Meu Algoritmo]
@AUTOR[Fulano de Tal]
@DESC[Descrição curta do que o algoritmo faz]
@VERSAO[1.0]
@BIBLIOTECA[minhaLib]
```

---

## Bibliotecas nativas <a name="bibliotecas"></a>

Importe com `importar nomeBiblioteca como alias;`

### mat <a name="mat"></a>

Matemática avançada.

```
importar mat como m;
```

| Símbolo/Função | Valor/Descrição |
|---|---|
| `m.pi` | π ≈ 3.14159 |
| `m.e` | e ≈ 2.71828 |
| `m.Infinito` | +∞ |
| `m.NegInfinito` | −∞ |
| `m.abs(x)` | \|x\| |
| `m.arred(x)` | Arredonda |
| `m.piso(x)` | ⌊x⌋ |
| `m.teto(x)` | ⌈x⌉ |
| `m.max(a, b)` | Máximo |
| `m.min(a, b)` | Mínimo |
| `m.sen(x)` | sin(x) |
| `m.cos(x)` | cos(x) |
| `m.tan(x)` | tan(x) |
| `m.ln(x)` | log natural — lança erro se x ≤ 0 |
| `m.log2(x)` | log₂(x) |
| `m.log10(x)` | log₁₀(x) |
| `m.log(x, base)` | log_base(x) |
| `m.aleatorio(min, max)` | Inteiro aleatório em [min, max] |
| `m.somatorio(fn, min, max)` | Σ fn(i) de min até max |
| `m.produtorio(fn, min, max)` | Π fn(i) de min até max |
| `m.sinal(x)` | -1, 0 ou 1 |

---

### metodos <a name="metodos"></a>

Estruturas de dados e verificadores de tipo.

```
importar metodos como m;
// Ou importação modular:
importar metodos.lista como li;
importar metodos.mapa como mp;
```

#### m.caracter(v)

| Método | Descrição |
|---|---|
| `.maiusculo()` | MAIÚSCULAS |
| `.minusculo()` | minúsculas |
| `.capitalizar()` | Primeira letra maiúscula |
| `.inverter()` | String ao contrário |
| `.aparar()` | Remove espaços das bordas |
| `.tamanho()` | Comprimento em caracteres |
| `.contem(s)` | Verdadeiro se contém `s` |
| `.mesclar(s)` | Concatena com `s` |

#### m.lista(v1, v2, ...)

| Método | Descrição |
|---|---|
| `.adicionar(v)` | Adiciona ao final |
| `.remover(v)` | Remove primeira ocorrência de `v` |
| `.obter(i)` | Elemento no índice `i` |
| `.tamanho()` | Número de elementos |
| `.contem(v)` | Verdadeiro se `v` está na lista |
| `.ordenar()` | Ordena in-place (crescente) |
| `.inverter()` | Inverte a ordem |
| `.transformar(fn)` | Devolve nova lista com `fn` aplicada a cada elemento |
| `.filtrar(pred)` | Devolve nova lista apenas com os elementos que passam no predicado |
| `.reduzir(fn, ini?)` | Acumula um único valor; `ini` é o acumulador inicial |
| `.percorrer(fn)` | Executa `fn(item, i)` para cada elemento (sem retorno) |

`transformar` e `filtrar` aceitam **expressões curtas em string** além de funções:

| String | Efeito em `transformar` | Efeito em `filtrar` |
|---|---|---|
| `"*2"` / `"/3"` / `"+1"` / `"-5"` | operação aritmética | — |
| `"**2"` | x² | — |
| `"mod 2"` | resto (sempre ≥ 0) | mantém onde resto ≠ 0 |
| `">0"` / `"<=10"` / `"!=0"` / `"==5"` | — | comparação booleana |

`reduzir` aceita operadores string: `"+"`, `"-"`, `"*"`, `"max"`, `"min"`

```
importar metodos como m;

super nums = m.lista(1, 2, 3, 4, 5, 6);

nums.transformar("*2")          // → [2, 4, 6, 8, 10, 12]
nums.transformar("**2")         // → [1, 4, 9, 16, 25, 36]
nums.filtrar(">3")              // → [4, 5, 6]
nums.filtrar("mod 2")           // → [1, 3, 5]  (ímpares)
nums.reduzir("+")               // → 21
nums.reduzir("max")             // → 6
nums.reduzir("*", 1)            // → 720
nums.percorrer((x, i) => imprima(f"[{i}] {x}"))
```

#### m.mapa()

| Método | Descrição |
|---|---|
| `.definir(chave, valor)` | Insere ou atualiza |
| `.obter(chave)` | Retorna valor (lança erro se inexistente) |
| `.remover(chave)` | Remove a chave |
| `.tem(chave)` | Verdadeiro se chave existe |
| `.tamanho()` | Número de pares |

#### m.conjunto()

| Método | Descrição |
|---|---|
| `.adicionar(v)` | Adiciona (ignora duplicatas) |
| `.remover(v)` | Remove |
| `.tem(v)` | Verdadeiro se `v` existe |
| `.tamanho()` | Número de elementos |
| `.uniao(outro)` | A ∪ B |
| `.intersecao(outro)` | A ∩ B |
| `.diferenca(outro)` | A \ B |

#### m.numero(v)

| Método | Descrição |
|---|---|
| `.sinal()` | -1, 0 ou 1 |
| `.int()` | Trunca (sem arredondar) |
| `.re()` | Converte para real |
| `.decimal(n)` | Arredonda com `n` casas |
| `.fatorar(modo)` | 1 = string, 0 = lista de pares [primo, exp] |

#### m.vetor([x, y, z, ...])

| Método | Descrição |
|---|---|
| `.dimensao()` | Número de componentes |
| `.soma(u)` | v + u |
| `.subtrair(u)` | v − u |
| `.escalar(k)` | k · v |
| `.ponto(u)` | v · u (produto escalar) |
| `.norma()` | \|v\| (comprimento) |
| `.normalizar()` | v / \|v\| |

#### m.matriz([[linha1], [linha2], ...])

| Propriedade/Método | Descrição |
|---|---|
| `.linhas` | Número de linhas |
| `.colunas` | Número de colunas |
| `.obter(i, j)` | Elemento na linha i, coluna j |
| `.soma(B)` | A + B |
| `.subtrair(B)` | A − B |
| `.mult(B ou escalar)` | Multiplicação matricial ou por escalar |
| `.transposta()` | Aᵀ |

#### Verificadores de tipo

| Função | Retorna verdadeiro quando… |
|---|---|
| `m.eNumero(v)` | v é número (não NaN) |
| `m.eInteiro(v)` | v é inteiro sem parte decimal |
| `m.eReal(v)` | v é real com parte decimal |
| `m.eTexto(v)` | v é string ou Caracter |
| `m.eBooleano(v)` | v é booleano |
| `m.eLista(v)` | v é Lista |
| `m.eMapa(v)` | v é Mapa |
| `m.eConjunto(v)` | v é Conjunto |
| `m.eVetor(v)` | v é Vetor |
| `m.eMatriz(v)` | v é Matriz |
| `m.eVazio(v)` | v é vazio (null) |
| `m.eIndefinido(v)` | v é indefinido |

---

### tabular <a name="tabular"></a>

Visualização em tabelas e barras.

```
importar tabular como t;
```

| Função | Descrição |
|---|---|
| `t.tabela(cabecalhos, linhas)` | Tabela formatada no console |
| `t.separador(char?, largura?)` | Linha divisória |
| `t.progresso(valor, max, largura?)` | Barra de progresso visual |
| `t.tabelaVerdade(expr, vars, inter?)` | Tabela-verdade de expressão lógica |

---

### calculo <a name="calculo"></a>

Análise matemática e teoria dos números.

```
importar calculo como c;
```

| Função | Descrição |
|---|---|
| `c.limite(fn, ponto)` | lim_{x→ponto} fn(x) |
| `c.derivada(fn, x, n?)` | f'(x) de ordem n (padrão 1) |
| `c.integral(fn, a, b)` | ∫_a^b fn(x) dx (regra de Simpson) |
| `c.gamma(x)` | Função Γ(x) |
| `c.digamma(x)` | Função ψ(x) = Γ'(x)/Γ(x) |
| `c.zeta(s)` | Riemann ζ(s) — s > 1 |
| `c.phi(n)` | Totiente de Euler φ(n) |
| `c.lambertW(x)` | Função W de Lambert |
| `c.taylor(fn, a, x, n)` | Série de Taylor de fn em torno de `a` |

---

### estatistica <a name="estatistica"></a>

Estatística descritiva e combinatória.

```
importar estatistica como e;
```

| Função | Descrição |
|---|---|
| `e.fatorial(n)` | n! |
| `e.combinacao(n, k)` | C(n,k) |
| `e.arranjo(n, k)` | A(n,k) |
| `e.media(lista)` | Média aritmética |
| `e.mediana(lista)` | Mediana |
| `e.moda(lista)` | Moda(s) — retorna lista |
| `e.variancia(lista)` | Variância populacional σ² |
| `e.desvioPadrao(lista)` | Desvio padrão σ |

---

### algebra <a name="algebra"></a>

Álgebra linear e geometria analítica sobre `vetor` e `matriz`.

```
importar algebra como al;
```

#### Álgebra vetorial

| Função | Descrição |
|---|---|
| `al.vetorial(v, u)` | Produto vetorial v × u — ambos devem ser 3D |
| `al.angulo(v, u)` | Ângulo entre v e u em radianos |
| `al.anguloDeg(v, u)` | Ângulo em graus |
| `al.projecao(v, u)` | Projeção de v sobre u |
| `al.saoParalelos(v, u)` | Verdadeiro se v ∥ u |
| `al.saoOrtogonais(v, u)` | Verdadeiro se v ⊥ u |

#### Álgebra matricial

| Função | Descrição |
|---|---|
| `al.identidade(n)` | Matriz identidade n×n |
| `al.zeros(m, n)` | Matriz zero m×n |
| `al.determinante(M)` | det(M) — eliminação gaussiana |
| `al.traco(M)` | tr(M) — soma da diagonal |
| `al.inversa(M)` | M⁻¹ — Gauss-Jordan; lança erro se singular |
| `al.resolverSistema(A, b)` | Resolve Ax = b; b deve ser vetor; retorna vetor x |

#### Geometria analítica

| Função | Descrição |
|---|---|
| `al.distancia(p1, p2)` | Distância euclidiana entre dois pontos |
| `al.pontoMedio(p1, p2)` | Ponto médio |
| `al.equacaoReta(A, B)` | Mapa `{a, b, c}` tal que ax+by+c=0 |
| `al.distPontoReta(P, A, B)` | Distância do ponto P à reta AB |
| `al.intersecaoRetas(A, B, C, D)` | Interseção das retas AB e CD (2D) |
| `al.areaTriangulo(A, B, C)` | Área do triângulo ABC |
| `al.perimetroTriangulo(A, B, C)` | Perímetro do triângulo ABC |
| `al.areaCirculo(r)` | π·r² |
| `al.perimetroCirculo(r)` | 2·π·r |
| `al.pontoCirculo(cx, cy, r, θ)` | Ponto na circunferência com ângulo θ |
| `al.equacaoPlano(A, B, C)` | Mapa `{a,b,c,d}` tal que ax+by+cz+d=0 |
| `al.distPontoPlano(P, plano)` | Distância do ponto P ao plano |
| `al.saoColineares(A, B, C)` | Verdadeiro se A, B, C são colineares |
| `al.saoCoplanares(A, B, C, D)` | Verdadeiro se A, B, C, D são coplanares |

---

### tempo <a name="tempo"></a>

Medição de performance.

```
importar tempo como tp;
```

| Função | Descrição |
|---|---|
| `tp.agora()` | Timestamp em ms |
| `tp.medirExecucao(fn)` | Executa `fn` e imprime o tempo decorrido |
| `tp.testeStress(fn, max)` | Tabela de crescimento assintótico (Big-O visual) |

---

### graficos <a name="graficos"></a>

Visualização matemática (requer PlotterAPI).

```
importar graficos como g;
```

#### Funções modulares (recomendadas)

| Função | Descrição |
|---|---|
| `g.grafico(funcoes, opcoes?)` | Plota função única, lista de funções ou datasets `{funcao,cor,rotulo,pontos}` compostos |
| `g.pontos(lista, opcoes?)` | Plota lista de pontos `[[x,y],...]` via linha contínua — sem ser dispersão |
| `g.conica(A,B,C,D,E,F, opcoes?)` | Plota cônica `Ax²+Bxy+Cy²+Dx+Ey+F=0` — desenha os dois ramos automaticamente |
| `g.relacao(rel, opcoes?)` | `[f1,f2,...]` (ramos), `{x,y,t}` (paramétrica) ou função simples |
| `g.anotado(f, marcadores, opcoes?)` | Plota `f` como linha + grupos de pontos marcados em cores distintas |

**Campos de `opcoes` comuns** (todos opcionais):

| Campo | Tipo | Padrão | Descrição |
|---|---|---|---|
| `titulo` | caracter | `""` | Título exibido no topo |
| `largura` | inteiro | `500` | Largura do canvas em pixels |
| `altura` | inteiro | `320` | Altura do canvas em pixels |
| `intervalo` | `[min, max]` | `[-10, 10]` | Intervalo do eixo X |
| `cor` | caracter | automática | Cor da curva principal (hex ou nome CSS) |
| `rotulo` | caracter | automático | Rótulo no legend |
| `legendas` | lista | `[]` | Lista de rótulos para múltiplas séries |
| `legenda` | booleano | `verdadeiro` | Exibe ou oculta o legend |
| `raio` | inteiro | `4`–`7` | Raio dos pontos marcados |

**Formatos aceitos por `marcadores` em `g.anotado`:**

```
// Cada elemento da lista pode ser qualquer um destes formatos:
[1.5, 0]          // par [x, y] explícito
2.3               // x só — y calculado por f(x)
{root: 1.5}       // objeto de método numérico (também aceita raiz:, x:)
[-2.0, 0.0, 1.0]  // lista de x-values — y = f(x) para cada um
[[0,0], [1,1]]    // lista de pares
```

**Exemplos:**

```
importar graficos como g;
importar mat como m;
importar calculo como c;

// Funções compostas
funcao f(x) { retorno m.sen(x); }
funcao h(x) { retorno m.cos(x); }
g.grafico([f, h], { intervalo: [-6.28, 6.28], titulo: "sen e cos" });

// Com datasets configurados individualmente
g.grafico([
    { funcao: f, cor: "#7c83ff", rotulo: "sen(x)" },
    { funcao: h, cor: "#4ade80", rotulo: "cos(x)" }
], { titulo: "Trigonometria" });

// Lista de pontos (curva contínua)
g.pontos([[0,0], [1,1], [2,4], [3,9]], { titulo: "Quadrados" });

// Cônica — elipse x²/4 + y²/9 = 1 → x²/4 + y²/9 - 1 = 0
// Multiplicando por 36: 9x² + 4y² - 36 = 0 → A=9,B=0,C=4,D=0,E=0,F=-36
g.conica(9, 0, 4, 0, 0, -36, { titulo: "Elipse" });

// Relação paramétrica: círculo (x=cos t, y=sen t)
g.relacao({ x: (t) => m.cos(t), y: (t) => m.sen(t), t: [0, 6.28] },
          { titulo: "Círculo Unitário" });

// Gráfico anotado — f com raízes e pontos críticos marcados
funcao g2(x) { retorno x**3 - 3*x; }
super raizes = c.raizes(g2, [-3, 3]);
super criticos = c.pontosCriticos(g2, [-3, 3]);
g.anotado(g2, [[1,0], raizes, criticos], { titulo: "f com marcadores" });
```

#### Funções legadas

| Função | Descrição |
|---|---|
| `g.plotar(dados, config?)` | Interface unificada de plotagem |
| `g.plotarFuncao(fn, [min, max])` | Gráfico 2D de função |
| `g.plotarMultiplas(listaDeFns, [min, max])` | Múltiplas funções sobrepostas |
| `g.dispersao(pontos)` | Scatter plot — pontos com `{x, y}` |
| `g.superficie3D(fn)` | Superfície z = fn(x, y) em 3D |

---

### probabilidade <a name="probabilidade"></a>

Teoria da probabilidade e simulação.

```
importar probabilidade como p;
```

| Função | Descrição |
|---|---|
| `p.sortearComPesos(itens, pesos)` | Sorteio ponderado |
| `p.uniforme(min, max)` | Real aleatório em [min, max] |
| `p.aleatorioInteiro(min, max)` | Inteiro aleatório em [min, max] |
| `p.rolarDados(qtd, faces)` | Simula `qtd` dados de `faces` lados |
| `p.monteCarlo(fn, n)` | Simulação Monte Carlo — fn retorna booleano |

---

## Editor <a name="editor"></a>

### Atalhos de teclado

| Atalho | Ação |
|---|---|
| `Ctrl+Enter` | Executar |
| `F5` | Executar |
| `F9` | Iniciar depuração passo a passo |
| `F10` | Próximo passo (durante depuração) |
| `Esc` | Parar depuração |
| `Ctrl+Z` | Desfazer |
| `Ctrl+Y` / `Ctrl+Shift+Z` | Refazer |
| `Tab` | Indentar / Navegar autocomplete |
| `Enter` | Selecionar autocomplete |
| `Escape` | Fechar autocomplete |

### Recursos do editor

- **Destaque de sintaxe** em tempo real
- **Autocomplete** — lista de palavras-chave, funções e snippets
- **Linter** — sublinha em amarelo possíveis erros de sintaxe
- **Depurador visual** — executa passo a passo com painel de variáveis
- **Exportar** — gera arquivo `.pseudo` ou biblioteca `.pseudolib`

---

## Exemplo completo

```
@NOME[Triângulo e Plano]
@AUTOR[Estudante]

trianguloEPlano()
{
    importar metodos como m;
    importar algebra como al;

    super A = m.vetor([0, 0, 0]);
    super B = m.vetor([3, 0, 0]);
    super C = m.vetor([0, 4, 0]);

    imprima("Área:", al.areaTriangulo(A, B, C));
    imprima("Perímetro:", al.perimetroTriangulo(A, B, C));
    imprima("Colineares?", al.saoColineares(A, B, C));

    super plano = al.equacaoPlano(A, B, C);
    super P = m.vetor([1, 1, 5]);
    imprima("Dist. ao plano:", al.distPontoPlano(P, plano));

    // Sistema 2x + y = 5,  x - y = 1
    super M = m.matriz([[2, 1], [1, -1]]);
    super b = m.vetor([5, 1]);
    super sol = al.resolverSistema(M, b);
    imprima("Solução:", sol);  // [2, 1]
}
```
