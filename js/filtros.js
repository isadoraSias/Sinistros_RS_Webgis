// ===== Sinistros de Trânsito RS - filtros e popup =====
// Espera que a variável global SINISTROS_DATA já tenha sido carregada
// (arquivo data/sinistros_dados.js)

(function () {
    var D = SINISTROS_DATA.dicts;
    var ROWS = SINISTROS_DATA.rows;

    // índices das colunas em cada linha de ROWS
    var COL = {
        lon: 0, lat: 1, data: 2, horario: 3, diaSemana: 4, municipio: 5,
        br: 6, km: 7, causa: 8, tipo: 9, classif: 10, fase: 11,
        condicao: 12, pista: 13, tracado: 14, pessoas: 15, mortos: 16,
        feridosLeves: 17, feridosGraves: 18, ilesos: 19, feridos: 20,
        veiculos: 21, ano: 22
    };

    var CORES = {
        'Com Vítimas Fatais': 'rgba(255,87,115,1.0)',
        'Com Vítimas Feridas': 'rgba(255,234,174,1.0)',
        'Sem Vítimas': 'rgba(136,206,189,1.0)'
    };

    function formatarData(iso) {
        if (!iso) return '';
        var partes = iso.split('-');
        if (partes.length !== 3) return iso;
        return partes[2] + '/' + partes[1] + '/' + partes[0];
    }

    function popupHTML(row) {
        var municipio = D.municipio[row[COL.municipio]];
        var diaSemana = D.diaSemana[row[COL.diaSemana]];
        var causa = D.causa_acidente[row[COL.causa]];
        var tipo = D.tipo_acidente[row[COL.tipo]];
        var classif = D.classificacao_acidente[row[COL.classif]];
        var fase = D.fase_dia[row[COL.fase]];
        var condicao = D.condicao_metereologica[row[COL.condicao]];
        var pista = D.tipo_pista[row[COL.pista]];
        var tracado = D.tracado_via[row[COL.tracado]];
        var br = row[COL.br];
        var km = row[COL.km];

        var localRodovia = (br !== null && br !== undefined)
            ? ('BR-' + br + (km !== null && km !== undefined ? ' &middot; Km ' + km : ''))
            : 'Não informado';

        return '' +
        '<div class="popup-sinistro">' +
          '<div class="popup-titulo">SINISTRO DE TRÂNSITO</div>' +
          '<div class="popup-corpo">' +
            '<b>Data e localização</b><br>' +
            formatarData(row[COL.data]) + ' &middot; ' + (row[COL.horario] || '') + ' (' + diaSemana + ')<br>' +
            municipio + ' — RS' +
            '<hr>' +
            '<b>Características</b><br>' +
            tipo + '<br>' +
            classif + '<br>' +
            condicao + ' &middot; ' + fase + '<br>' +
            'Pista ' + pista + ' &middot; ' + tracado + '<br>' +
            'Causa: ' + causa +
            '<hr>' +
            '<b>Envolvidos</b><br>' +
            row[COL.pessoas] + ' pessoas &middot; ' + row[COL.veiculos] + ' veículo(s)<br>' +
            'Mortos: ' + row[COL.mortos] + ' &middot; Feridos: ' + row[COL.feridos] + '<br>' +
            '(leves: ' + row[COL.feridosLeves] + ', graves: ' + row[COL.feridosGraves] + ', ilesos: ' + row[COL.ilesos] + ')' +
            '<hr>' +
            '<b>Localização na rodovia</b><br>' +
            localRodovia +
          '</div>' +
        '</div>';
    }

    // ---------- construção da camada ----------
    var clusterGroup = L.markerClusterGroup({
        chunkedLoading: true,
        maxClusterRadius: 60
    });

    function criarMarcador(row) {
        var classif = D.classificacao_acidente[row[COL.classif]];
        var cor = CORES[classif] || 'rgba(120,120,120,1.0)';
        var marker = L.circleMarker([row[COL.lat], row[COL.lon]], {
            radius: 4,
            opacity: 1,
            color: 'rgba(35,35,35,1.0)',
            weight: 1,
            fill: true,
            fillOpacity: 1,
            fillColor: cor
        });
        marker.bindPopup(popupHTML(row), { maxHeight: 400 });
        return marker;
    }

    // ---------- filtros ----------
    var filtroAtual = {
        classificacao: '',
        condicao: '',
        municipio: '',
        tipo: '',
        ano: ''
    };

    function linhaPassaNoFiltro(row) {
        if (filtroAtual.classificacao !== '' &&
            D.classificacao_acidente[row[COL.classif]] !== filtroAtual.classificacao) return false;
        if (filtroAtual.condicao !== '' &&
            D.condicao_metereologica[row[COL.condicao]] !== filtroAtual.condicao) return false;
        if (filtroAtual.municipio !== '' &&
            D.municipio[row[COL.municipio]] !== filtroAtual.municipio) return false;
        if (filtroAtual.tipo !== '' &&
            D.tipo_acidente[row[COL.tipo]] !== filtroAtual.tipo) return false;
        if (filtroAtual.ano !== '' &&
            String(row[COL.ano]) !== filtroAtual.ano) return false;
        return true;
    }

    function aplicarFiltros() {
        clusterGroup.clearLayers();
        var total = 0, comVitimas = 0, mortos = 0;
        var novosMarcadores = [];
        for (var i = 0; i < ROWS.length; i++) {
            var row = ROWS[i];
            if (!linhaPassaNoFiltro(row)) continue;
            total++;
            var classif = D.classificacao_acidente[row[COL.classif]];
            if (classif !== 'Sem Vítimas') comVitimas++;
            mortos += row[COL.mortos];
            novosMarcadores.push(criarMarcador(row));
        }
        clusterGroup.addLayers(novosMarcadores);
        atualizarContador(total, comVitimas, mortos);
    }

    function atualizarContador(total, comVitimas, mortos) {
        var el = document.getElementById('painel-resultado');
        if (!el) return;
        el.innerHTML =
            '<b>' + total.toLocaleString('pt-BR') + '</b> sinistros<br>' +
            comVitimas.toLocaleString('pt-BR') + ' com vítimas<br>' +
            mortos.toLocaleString('pt-BR') + ' mortes';
    }

    function popularSelect(id, valores, ordenar) {
        var select = document.getElementById(id);
        var lista = valores.slice();
        if (ordenar) lista.sort(function (a, b) { return a.localeCompare(b, 'pt-BR'); });
        lista.forEach(function (v) {
            var opt = document.createElement('option');
            opt.value = v;
            opt.textContent = v;
            select.appendChild(opt);
        });
        select.addEventListener('change', function () {
            var campo = select.getAttribute('data-campo');
            filtroAtual[campo] = select.value;
            aplicarFiltros();
        });
    }

    function popularAnos() {
        var anos = {};
        ROWS.forEach(function (r) { anos[r[COL.ano]] = true; });
        var lista = Object.keys(anos).sort();
        var select = document.getElementById('filtro-ano');
        lista.forEach(function (a) {
            var opt = document.createElement('option');
            opt.value = a;
            opt.textContent = a;
            select.appendChild(opt);
        });
        select.addEventListener('change', function () {
            filtroAtual.ano = select.value;
            aplicarFiltros();
        });
    }

    window.iniciarFiltrosSinistros = function (map) {
        map.addLayer(clusterGroup);

        popularSelect('filtro-classificacao', D.classificacao_acidente, false);
        popularSelect('filtro-condicao', D.condicao_metereologica, true);
        popularSelect('filtro-municipio', D.municipio, true);
        popularSelect('filtro-tipo', D.tipo_acidente, true);
        popularAnos();

        document.getElementById('filtro-limpar').addEventListener('click', function () {
            ['filtro-classificacao', 'filtro-condicao', 'filtro-municipio', 'filtro-tipo', 'filtro-ano']
                .forEach(function (id) { document.getElementById(id).value = ''; });
            filtroAtual = { classificacao: '', condicao: '', municipio: '', tipo: '', ano: '' };
            aplicarFiltros();
        });

        aplicarFiltros();
    };
})();
