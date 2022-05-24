$(function () {
    // モーダル表示
    $('#print-button').click(function () {
        $('#myModal').modal({ show: true });
        return false;
    });
    // モーダルの設定
    $('#pdf-exchange').click(function () {
        function isEmail(email) {
            var regex = /^([a-zA-Z0-9_.+-])+\@(([a-zA-Z0-9-])+\.)+([a-zA-Z0-9]{2,4})+$/;
            return regex.test(email);
        }

        var enableSendMail = $('#check-mailsend').prop("checked");
        var email = $('#inlineFormInputName').val() + '@' + $('#inlineFormInputGroupUsername').val();
        if (enableSendMail && !isEmail(email)) {
            console.log('not valid email');
            return;
        }
        // データ更新
        $('#pdf-st').text("PDFデータ作成中");
        OPEX_ItoD();
        LOAN_CALC();
        INHERITANCE();
        LEGAL_BANK_CALC();
        INITIAL_COST_CAL();

        INHERITANCE();
        OPEX_DtoG();
        //CALC();
        DATAUPDATE();
        var exchanger = new PdfExchange({
            enableSendMail,
            email
        });
        exchanger.process();
        return false;
    });
    // メール送信の切り替え
    $('#check-mailsend').change(function () {
        var enableSendMail = $(this).prop("checked");
        if (enableSendMail) {
            $('#pdf-exchange').prop("disabled",false);
        } else {
            $('#pdf-exchange').prop("disabled",true);
        }
    });

    $('#hometab1').click(function () {
        $('#print-button-wrap').addClass('invisible')
    })
    $('#hatstab1').click(function () {
        $('#print-button-wrap').addClass('invisible')
    })
    $('#hatstab2').click(function () {
        $('#print-button-wrap').removeClass('invisible')
    })
})

var PdfExchange = function (prop) {
    prop = prop || {}
    this.pdfName = prop.pdfName || $('#name_property').val()+"分析資料.pdf";
    // this.sendMailUrl = 'http://localhost:3002/upload?address=chisho.ishihara%40gmail.com'
    this.sendMailUrl = 'https://u19yk5k3fb.execute-api.ap-northeast-1.amazonaws.com/upload'
    // basePdfに指定したページ数
    this.basePageNum = 2;
    this.basePdfUrl = 'base.pdf';
    this.sheetPdfUrl = 'sheet.pdf';
    this.fontUrl = 'mplus-1m-regular.ttf';
    this.fontName = 'mplus-1m-regular.ttf';
    this.fontData = '';
    this.graphDatas = [];
    this.pdfData = '';
    this.sheetData = {};
    this.mapData = null;
    this.enableSendMail = !!prop.enableSendMail;
    this.email = prop.email || '';
    this.qrData = null;
};

PdfExchange.prototype.dispose = function () {
    var _this = this;
    return new Promise(function (resolve, _) {
        console.log('dispose');
        if (_this.graphDatas) {
            for (var i = 0; i < _this.graphDatas.length; i++) {
                window.URL.revokeObjectURL(_this.graphDatas[i].graph);
            }
            _this.graphDatas = [];
        }
        if (_this.fontData) {
            window.URL.revokeObjectURL(_this.fontData);
            _this.fontData = null;
        }
        if (_this.pdfData) {
            window.URL.revokeObjectURL(_this.pdfData);
            _this.pdfData = null;
        }
        _this.pdfBlob = null;
        if (_this.mapData) {
            window.URL.revokeObjectURL(_this.mapData);
            _this.mapData = null;
        }
        _this.sheetData = {};
        _this.mapData = null;
        _this.qrData = null;
        resolve();
    });
}


// pdf変換する
PdfExchange.prototype.process = function () {
    // promiseのリスト
    var promises = [Promise.resolve()];
    // シークエンス実行させるための関数
    function pushPromise(_this, promise) {
        promises.push(promises.pop().then(function () {
            return promise.call(_this);
        }));
    }
    console.log('process start');
    pushPromise(this, this.getFontData);
    pushPromise(this, this.getBasePdf);
    pushPromise(this, this.getSheetPdf);
    pushPromise(this, this.makeQR);
    // グラフ処理はリストで帰ってくるので繰り返し
    var graphesPromise = this.renderGraphes();
    for (var i = 0; i < graphesPromise.length; i++) {
        pushPromise(this, graphesPromise[i]);
    }
    pushPromise(this, this.genSheetData)
    //pushPromise(this, this.renderMap)
    pushPromise(this, this.genPdf);
    if (this.enableSendMail) {
        pushPromise(this, this.sendMail);
    } else {
        pushPromise(this, this.sendMail);///もとはsaveData
    }
    pushPromise(this, this.dispose);
    pushPromise(this, function () {
        var _this = this;
        return new Promise(function (resolve, _) {
            if (_this.enableSendMail) {
                new Snackbar().show('メールを送信しました。');
                $('#pdf-st').text("");
            }
            console.log('process end');
            resolve();
        });
    });
}

// Pdf作成
PdfExchange.prototype.genPdf = function () {
    var _this = this;
    return new Promise(function (resolve, reject) {
        console.log('genpdf start', _this.fontData);
        labelmake({
            template: _this.genTemplate(_this.fontName),
            inputs: _this.genInputs(_this.mapData),
            font: { [_this.fontName]: _this.fontData }
        }).then(function (pdf) {
            var blob = new Blob([pdf.buffer], { type: "application/pdf" });
            _this.pdfBlob = blob //window.URL.createObjectURL(blob);
            console.log('genpdf done');
            resolve();
        });
    });
}

// font読み込み
PdfExchange.prototype.getFontData = function () {
    var _this = this
    var fontUrl = this.fontUrl
    return new Promise(function (resolve, reject) {
        console.log('getFontData start', fontUrl);
        $.ajax({
            url: fontUrl,
            type: "GET",
            dataType: 'binary',
            responseType: 'arraybuffer',
            processData: false,
            success: function (data, status) {
                console.log('getFontData end', status);
                if (status !== 'success') {
                    return reject(status);
                }
                _this.fontData = data;
                resolve();
            }
        });
    });
}

PdfExchange.prototype.getBasePdf = function () {
    var _this = this;
    var pdfUrl = this.basePdfUrl;
    return new Promise(function (resolve, reject) {
        console.log('getBasePdf start');
        $.ajax({
            url: pdfUrl,
            type: "GET",
            dataType: 'binary',
            responseType: 'arraybuffer',
            processData: false,
            success: function (data, status) {
                console.log('getBasePdf end', status);
                if (status !== 'success') {
                    return reject(status);
                }
                _this.basePdf = data;
                resolve();
            }
        })
    })
}

PdfExchange.prototype.getSheetPdf = function () {
    var _this = this;
    var pdfUrl = this.sheetPdfUrl;
    return new Promise(function (resolve, reject) {
        console.log('getSheetPdf start');
        $.ajax({
            url: pdfUrl,
            type: "GET",
            dataType: 'binary',
            responseType: 'arraybuffer',
            processData: false,
            success: function (data, status) {
                console.log('getSheetPdf end', status);
                if (status !== 'success') {
                    return reject(status);
                }
                _this.sheetPdf = data;
                resolve();
            }
        })
    })
}

/// checkボックスの値からrenderする図のpromiseのリストを返す
PdfExchange.prototype.renderGraphes = function () {
    this.graphs = [];
    var queue = [];
    if ($("#customSwitch0").prop("checked")) {
        this.graphs.push({
            legendShow: null,
            title: '凡例'
        });
    }

    if ($('#customSwitch1').prop('checked')) {
        this.graphs.push({
            legendShow: "000000111111111111111111111111111111111111111",
            title: "CFツリー（GPI・EGI・OPEX・NOI・ADS・CF）"
        });
    }
    if ($('#customSwitch2').prop('checked')) {
        this.graphs.push({
            legendShow: "111111001101111111111111111111111111111111111",
            title: "デッドクロス（ローン元金・減価償却費・ATCF）"
        });
    }

    if ($('#customSwitch3').prop('checked')) {
        this.graphs.push({
            legendShow: "111111111100111111111111111111111111111111111",
            title: "税引後CF（ATCF・累積ATCF）"
        });
    }

    if ($('#customSwitch4').prop('checked')) {
        this.graphs.push({
            legendShow: "111111111110111111111111111111111111111110111",
            title: "資金回収期間（累積ATCF・投下自己資金）"
        });
    }

    if ($('#customSwitch5').prop('checked')) {
        this.graphs.push({
            legendShow: "111111111111001111011111111111111111111111011",
            title: '売却の検討（売却想定価格・ローン残債・物件購入価格・売却時手取金額（税引後））'
        });
    }

    if ($('#customSwitch6').prop('checked')) {
        this.graphs.push({
            legendShow: "111111111111111111111111111111111110111001111",
            title: "相続税納税資金の準備（相続税額・現金資産・相続税納税後剰余額）"
        });
    }

    if ($('#customSwitch7').prop('checked')) {
        this.graphs.push({
            legendShow: "111111111111111111101111110111111111111111111",
            title: 'IRRとNPV(IRR・NPV）'
        });
    }

   if ($('#customSwitch8').prop('checked')) {
        this.graphs.push({
            legendShow: "111111111111111111101111111111111111101111111",
            title: '相続税圧縮勘案NPV（相続勘案NPV・NPV)'
        });
    }

    var _this = this;
    for (var i = 0; i < this.graphs.length; i++) {
        queue.push((function (i) {
            // そのままiを使うと参照が使い回されるのでfunction内の参照にする
            return function () {
                var legendShow = [];
                var title = _this.graphs[i].title;
                if (_this.graphs[i].legendShow) {
                    for (var j = 0; j < _this.graphs[i].legendShow.length; j++) {
                        legendShow.push(parseInt(_this.graphs[i].legendShow.slice(j, j + 1)));
                    }
                }
                return _this.renderGraph.call(_this, title, legendShow);
            }
        })(i));
    }
    return queue;
}

PdfExchange.prototype.renderGraph = function (title, legendShow) {
    var _this = this;
    return new Promise(function (resolve, reject) {
        console.log('renderGraph start', JSON.stringify(legendShow));
        if (legendShow.length == 0) {
            // 凡例
            var canvas = document.getElementById("cfChart");
        } else {
            var canvas = document.createElement('canvas');
            canvas.classList.add('mt5');
            canvas.height = 169.58;
            canvas.width = 256.16;
            // canvas.style = ' -ms-transform: rotate(-25.2deg);-webkit-transform: rotate(-25.2deg);transform: rotate(-25.2deg);';
            document.body.appendChild(canvas);
        }
        var canvas2data = function () {
            console.log('cnvas2data start');
            var dataUrl = canvas.toDataURL("image/png");
            _this.graphDatas.push({
                graph: dataUrl,
                title: title
            });

            if (legendShow.length > 0) {
                document.body.removeChild(canvas);
                console.log('cnvas2data remove canvas');
            }
            console.log('cnvas2data end');
            resolve();
        }

        if (legendShow.length == 0) {
            // 凡例
            return canvas2data();
        }
        // TODO: mybarchatを乗っ取っているが元のグラフは消えるのか？
        // if (myBarChart) {
        //     myBarChart.destroy();
        // }
        chart = new Chart(canvas.getContext('2d'), {
            type: 'bar',
            data: {
                labels: slice_year,
                datasets: [
                    {
                        label: 'GPI',
                        data: slice_gpi,
                        type: 'line',
                        fill: false,
                        radius: 0,
                        hidden: legendShow[0],
                        borderColor: '#FFD180'
                    }, {
                        label: 'EGI',
                        data: slice_egi,
                        type: 'line',
                        fill: false,
                        radius: 0,
                        hidden: legendShow[1],
                        borderColor: '#FFAB40'
                    }, {
                        label: 'OPEX',
                        data: slice_opex,
                        type: 'line',
                        fill: false,
                        radius: 0,
                        hidden: legendShow[2],
                        borderColor: '#283593'

                    }, {
                        label: 'NOI',
                        data: slice_noi,
                        type: 'line',
                        fill: false,
                        radius: 0,
                        hidden: legendShow[3],
                        borderColor: '#FF9100'
                    }, {
                        label: 'ADS',
                        data: slice_ads,
                        type: 'line',
                        fill: false,
                        lineTension: 0,
                        radius: 0,
                        hidden: legendShow[4],
                        borderColor: "#D1C4E9",
                    }, {
                        label: 'CF',
                        data: slice_cf,
                        type: 'bar',
                        fill: false,
                        radius: 0,
                        hidden: legendShow[5],
                        borderColor: '#FF9100',
                        backgroundColor: '#FF9100'
                    }, {
                        label: 'ローン元金',
                        data: slice_loan_principal_year,
                        type: 'line',
                        fill: false,
                        lineTension: 0,
                        radius: 0,
                        hidden: legendShow[6],
                        borderColor: "#7E57C2",
                    }, {
                        label: '減価償却費',
                        data: slice_depre_current,
                        type: 'line',
                        lineTension: 0,
                        fill: false,
                        radius: 0,
                        hidden: legendShow[7],
                        borderColor: '#CDDC39'
                    }, {
                        label: '課税対象額',
                        data: slice_taxable,
                        type: 'line',
                        fill: true,
                        radius: 0,
                        hidden: legendShow[8],
                        borderColor: '#03A9F4',
                        backgroundColor: '#E1F5FE'
                    }, {
                        label: '税額',
                        data: slice_amount_tax,
                        type: 'line',
                        fill: true,
                        radius: 0,
                        hidden: legendShow[9],
                        borderColor: '#01579B',
                        backgroundColor: '#E8EAF6'
                    }, {
                        label: 'ATCF',
                        data: slice_atcf,
                        borderColor: 'black',
                        type: 'bar',
                        fill: false,
                        radius: 0,
                        hidden: legendShow[10],
                        borderColor: '#000000',
                        backgroundColor: '#FF6D00'
                    }, {
                        label: '累積ATCF',
                        data: slice_cum_atcf,
                        type: 'line',
                        fill: true,
                        radius: 0,
                        hidden: legendShow[11],
                        yAxisID: "yright",
                        backgroundColor: "#FFE0B2",
                        borderColor: '#FF6D00'

                    }, {
                        label: '売却想定価格',
                        data: slice_price_sale,
                        type: 'line',
                        fill: false,
                        radius: 0,
                        hidden: legendShow[12],
                        yAxisID: "yright",
                        borderColor: '#0091EA'

                    }, {
                        label: 'ローン残債',
                        data: slice_loan_pv_year,
                        type: 'line',
                        fill: false,
                        radius: 0,
                        hidden: legendShow[13],
                        yAxisID: "yright",
                        borderColor: "#EDE7F6"

                    }, {
                        label: '減価償却累計',
                        data: slice_depre_total,
                        type: 'line',
                        fill: false,
                        radius: 0,
                        hidden: legendShow[14],
                        yAxisID: "yright",
                        borderColor: "#7CB342"

                    }, {
                        label: '譲渡税対象',
                        data: slice_fortaxsale,
                        type: 'line',
                        fill: true,
                        radius: 0,
                        hidden: legendShow[15],
                        yAxisID: "yright",
                        borderColor: "#EDE7F6",
                        backgroundColor: '#80D8FF'

                    }, {
                        label: '譲渡税',
                        data: slice_tax_transfer,
                        type: 'bar',
                        fill: true,
                        radius: 0,
                        hidden: legendShow[16],
                        yAxisID: "yleft",
                        backgroundColor: '#0091EA'
                    }, {
                        label: '売却時手取金額(税引前）',
                        data: slice_sell_bftx,
                        type: 'bar',
                        fill: true,
                        radius: 0,
                        hidden: legendShow[17],
                        yAxisID: "yright",
                        backgroundColor: '#C5E1A5'

                    }, {
                        label: '売却時手取金額(税引後)',
                        data: slice_sell_aftx,
                        type: 'bar',
                        fill: true,
                        radius: 0,
                        hidden: legendShow[18],
                        yAxisID: "yright",
                        backgroundColor: '#8BC34A'

                    }, {
                        label: 'NPV',
                        data: NPV,
                        type: 'line',
                        fill: true,
                        radius: 0,
                        hidden: legendShow[19],
                        yAxisID: "yright",
                        borderColor: '#F57F17',
                        backgroundColor: '#FFF9C4'

                    }, {
                        label: '建物相続税評価額（万円）',
                        data: slice_valuation_inheritance_building,
                        type: 'line',
                        fill: false,
                        radius: 0,
                        hidden: legendShow[20],
                        yAxisID: "yright",
                        borderColor: '#A7FFEB'

                    }, {
                        label: '土地相続税評価額（万円）',
                        data: slice_valuation_inheritance_land,
                        type: 'line',
                        fill: false,
                        radius: 0,
                        hidden: legendShow[21],
                        yAxisID: "yright",
                        borderColor: '#1DE9B6'

                    }, {
                        label: '相続税評価額合計（万円）',
                        data: slice_valuation_inheritance_property,
                        type: 'line',
                        fill: false,
                        radius: 0,
                        hidden: legendShow[22],
                        yAxisID: "yright",
                        borderColor: '#1DE9B6'

                    }, {
                        label: '建物積算評価額（万円）',
                        data: slice_bank_building,
                        type: 'line',
                        fill: false,
                        radius: 0,
                        hidden: legendShow[23],
                        yAxisID: "yright",
                        borderColor: '#B388FF'

                    }, {
                        label: '土地積算評価額（万円）',
                        data: slice_bank_land,
                        type: 'line',
                        fill: false,
                        radius: 0,
                        hidden: legendShow[24],
                        yAxisID: "yright",
                        borderColor: '#7C4DFF'

                    }, {
                        label: '積算評価額合計（万円）',
                        data: slice_bank_total,
                        type: 'line',
                        fill: false,
                        radius: 0,
                        hidden: legendShow[25],
                        yAxisID: "yright",
                        borderColor: "#311B92",

                    }, {
                        label: 'IRR',
                        data: IRR,
                        type: 'line',
                        fill: true,
                        radius: 0,
                        hidden: legendShow[26],
                        yAxisID: "yleft",
                        borderColor: '#90A4AE'

                    }, {
                        label: '表面利回',
                        data: rate_s,
                        type: 'line',
                        fill: false,
                        radius: 0,
                        hidden: legendShow[27],
                        yAxisID: "yleft",
                        borderColor: '#FFD180'

                    }, {
                        label: 'Caprate',
                        data: caprate,
                        type: 'line',
                        fill: false,
                        radius: 0,
                        hidden: legendShow[28],
                        yAxisID: "yleft",
                        borderColor: '#FFB74D'

                    }, {
                        label: 'FCR',
                        data: FaCR,
                        type: 'line',
                        fill: false,
                        radius: 0,
                        hidden: legendShow[29],
                        yAxisID: "yleft",
                        borderColor: '#FF9100'

                    }, {
                        label: 'K%',
                        data: Kpc,
                        type: 'line',
                        fill: false,
                        radius: 0,
                        hidden: legendShow[30],
                        yAxisID: "yleft",
                        borderColor: "#D1C4E9",

                    }, {
                        label: 'BTCCR',
                        data: BTCCR,
                        type: 'line',
                        fill: false,
                        radius: 0,
                        hidden: legendShow[31],
                        yAxisID: "yleft",
                        borderColor: '#EF6C00'

                    }, {
                        label: 'ATCCR',
                        data: ATCCR,
                        type: 'line',
                        fill: false,
                        radius: 0,
                        hidden: legendShow[32],
                        yAxisID: "yleft",
                        borderColor: '#E65100'

                    }, {
                        label: 'DCR',
                        data: DeCR,
                        type: 'line',
                        fill: false,
                        radius: 0,
                        hidden: legendShow[33],
                        yAxisID: "yleft",
                        borderColor: '#0097A7'

                    }, {
                        label: '総相続税評価額',
                        data: valuation_inheritance_total,
                        type: 'line',
                        fill: false,
                        radius: 0,
                        hidden: legendShow[34],
                        yAxisID: "yright",
                        borderColor: '#004D40',
                        backgroundColor: '#FFFFFF'

                    }, {
                        label: '相続税額',
                        data: inheritance_amount,
                        type: 'line',
                        fill: false,
                        radius: 0,
                        hidden: legendShow[35],
                        yAxisID: "yright",
                        borderColor: '#00796B',

                    }, {
                        label: '相続税圧縮額',
                        data: inheritance_compression,
                        type: 'line',
                        fill: true,
                        radius: 0,
                        hidden: legendShow[36],
                        yAxisID: "yright",
                        borderColor: '#00796B',
                        backgroundColor: '#B2DFDB'


                    }, {
                        label: '相続勘案NPV',
                        data: NPV_INHERITANCE,
                        type: 'line',
                        fill: true,
                        radius: 0,
                        hidden: legendShow[37],
                        yAxisID: "yright",
                        borderColor: '#00796B',
                        backgroundColor: '#FFF9C4'
                    }, {
                        label: '相続勘案IRR',
                        data: IRR_INHERITANCE,
                        type: 'line',
                        fill: false,
                        radius: 0,
                        hidden: legendShow[38],
                        yAxisID: "yleft",
                        borderColor: '#00796B',
                        backgroundColor: '#FFF9C4'
                    }, {
                        label: '現金資産（万円）',
                        data: shisan_cash,
                        type: 'line',
                        fill: false,
                        radius: 5,
                        hidden: legendShow[39],
                        yAxisID: "yright",
                        borderColor: '#FF6D00',
                        backgroundColor: '#FFE57F',
                        order: 0
                    }, {
                        label: '相続税納税後剰余額',
                        data: inheritance_togo,
                        type: 'line',
                        fill: true,
                        radius: 0,
                        hidden: legendShow[40],
                        yAxisID: "yright",
                        borderColor: '#004D40',
                        backgroundColor: '#FFAB91'
                    }, {
                        label: '投下自己資金',
                        data: graph_equity,
                        type: 'line',
                        fill: false,
                        radius: 0,
                        hidden: legendShow[41],
                        yAxisID: "yright",
                        borderColor: '#00E676',
                        backgroundColor: '#FFFFFF',
                        borderDash: [10, 50]

                    }, {
                        label: '物件購入価格',
                        data: graph_totalcost,
                        type: 'line',
                        fill: false,
                        radius: 0,
                        hidden: legendShow[42],
                        yAxisID: "yright",
                        borderColor: '#00C853',
                        backgroundColor: '#FFFFFF',
                        borderDash: [10, 50]

                    }, {
                        label: 'ゼロラインR',
                        data: graph_zeroline,
                        type: 'line',
                        fill: false,
                        radius: 0,
                        hidden: legendShow[43],
                        yAxisID: "yright",
                        borderColor: '#000000',
                        backgroundColor: '#FFF9C4',
                        borderDash: [10, 50]

                    }, {
                        label: 'ゼロラインL',
                        data: graph_zeroline,
                        type: 'line',
                        fill: false,
                        radius: 0,
                        hidden: legendShow[44],
                        yAxisID: "yleft",
                        borderColor: '#000000',
                        backgroundColor: '#FFF9C4',
                        borderDash: [10, 50]

                    }
                ]
            },
            options: {
                rotation: 90,
                scales: {
                    yAxes: [{
                        id: "yleft",
                        position: "left",
                        gridLines: {
                            drawOnChartArea: false,
                            zeroLineColor: 'black'
                        }
                    },

                    {
                        id: "yright",
                        position: "right",
                        gridLines: {
                            drawOnChartArea: false,
                            zeroLineColor: 'black'
                        }

                    }],
                },
                legend: {
                    display: true,
                    position: "top",
                    legendCallback: function (chart) {
                        // Return the HTML string here.

                    }

                },
                animation: {
                    duration: 0,
                    onComplete: function (animation) {
                        canvas2data();//resolve();
                    }
                }
            }
        })
    })
}

PdfExchange.prototype.saveData = function () {
    var saveData = (function () {
        var a = document.createElement("a");
        document.body.appendChild(a);
        a.style = "display: none";
        return function (blobUrl, fileName) {
            a.href = blobUrl // window.URL.createObjectURL(blob);
            a.download = fileName;
            a.click();
            // window.URL.revokeObjectURL(blobUrl);
        };
    }());
    var _this = this
    return new Promise(function (resoleve, _) {
        console.log('saveData start', _this.pdfName);
        _this.pdfData = window.URL.createObjectURL(_this.pdfBlob);
        saveData(_this.pdfData, _this.pdfName);
        console.log('saveData end');
        resoleve();
    });
}

PdfExchange.prototype.renderMap = function () {
    var _this = this
    return new Promise(function (resolve, _) {
        //width: 385px;
        //height: 385px;
        console.log('start renderMap')
        //var zoom = $("#zoom").text() ? parseFloat($("#zoom").text()) : 16;
        //var center = window.map_center;
        console.log('rendering1');
        function blobToDataURL(blob, callback) {
            var a = new FileReader();
            a.onload = function (e) { callback(e.target.result); }
            a.readAsDataURL(blob);
        }
        console.log('rendering2');
        $.ajax({
            url: 'https://maps.googleapis.com/maps/api/staticmap?zoom=' + zoom +
                '&center=' + center.lat + ',' + center.lng +
                '&markers=' + center.lat + ',' + center.lng +
                '&key=AIzaSyDVcgqbfduWtap_fjTPKFk_lPHUzHzRScY' +
                '&size=385x385',
            type: "GET",
            dataType: 'binary',
            responseType: 'arraybuffer',
            processData: false,
            success: function (data, status) {
                console.log('renderMap end', status);
                if (status !== 'success') {
                    return reject(status);
                }
                console.log('renderMap', data);
                var blob = new Blob([data], { type: "image/png" });
                blobToDataURL(blob, function (ret) {
                    _this.mapData = ret;
                    resolve();
                })
            }
        })
        
    })
}

PdfExchange.prototype.genSheetData = function () {
    var _this = this
    return new Promise(function (resolve, _) {
        console.log('genSheet');
        function isFloat(n) {
            return Number(n) === n && n % 1 !== 0;
        }
        function dataToString(data) {
            if (isNaN(data)) return 'NaN';
            else if (data == null) return '';
            else if (typeof data === 'number' && isFloat(data)) return '' + data.toFixed(0);
            else if (typeof data === 'number') return '' + data;
            else return data;
        }
         function dataToStringfloat(data) {
            if (isNaN(data)) return 'NaN';
            else if (data == null) return '';
            else if (typeof data === 'number' && isFloat(data)) return '' + data.toFixed(2);
            else if (typeof data === 'number') return '' + data;
            else return data;
        }
        var inputs = []
        var schemas = []
        var currentInput = {};
        var currentSchema = {};
        var headers = ['オーナーの年齢（歳）', '購入後年数（年）', '築年数（年）', 'GPI（万円）', 'EGI（万円）', '- OPEX（万円）', '= NOI（万円）', '- ADS（万円）', '= BTCF（万円）', '+ ローン元金（万円）', '- 減価償却費（万円）', '= 課税対象額（万円）', '税額（万円）', 'ATCF（万円）', '累積ATCF（万円）', '売却想定価格（万円）', '期末ローン残債（万円）', '税引前売却手取額（万円）', '譲渡税対象（万円）', '譲渡税（万円）', '税引後売却手取額（万円）', '増加資産（万円）', 'NPV（万円）', '土地積算評価（万円）', '建物積算評価（万円）', '積算評価合計（万円）', '土地相続税評価額（万円）', '建物相続税評価額（万円）', '相続税評価額合計（万円）', '相続税額（万円）', '相続税圧縮額（万円）', '相続税圧縮効果勘案NPV（万円）', '累積償却額（万円）', '現金（万円）', '総相続税評価額（万円）', '相続税納税剰余額（万円）'];

        var headers2 = ['表面利回', 'Caprate', 'FCR', 'K%', 'CCR(税引前)', 'CCR(税引後', 'IRR', 'DCR', '相続税圧縮効果勘案IRR'];

        var pageNum = Math.floor(slice_year.length / 30) + (slice_year.length % 30 > 0 ? 1 : 0);
        // 通年のコラム数を数える
        var colSum = 0;
        var data = 0;
        console.log('years:', slice_year.length, 'page', pageNum)

        var xUnit = 8.27;
        var yUnit = 3.8;
        var fontSize = 5;

        // for (var index = 0; index < slice_year.length; index++) {
        for (var pageNo = 0; pageNo < pageNum; pageNo++) {
            var years = slice_year.map((item) => item).filter((item, index) => index >= pageNo * 30 && index < (pageNo + 1) * 30);
            for (var col = 0; col <= years.length; col++) {
                for (var row = 0; row <= headers.length; row++) {
                    // header
                    // col
                    // field
                    if (col == 0) {
                        // 開ける
                        if (row == 0) continue;
                        // header
                        currentInput
                        ["header" + row] = headers[row - 1];

                        currentSchema["header" + row] = {
                            "type": "text",
                            "position": {
                                "x": 16.99,
                                "y": 20.67 + (yUnit * (row - 1))
                            },
                            "width": 21.51,
                            "height": 2.76,
                            "alignment": "right",
                            "fontSize": fontSize,
                            "characterSpacing": 0,
                            "lineHeight": 1
                        };
                    } else if (row == 0) {
                        // col year
                        currentInput
                        ["year" + col] = '' + years[col - 1];

                        currentSchema["year" + col] = {
                            "type": "text",
                            "position": {
                                "x": 38.63 + (xUnit * (col - 1)),
                                "y": 16.65
                            },
                            "width": 7,
                            "height": 3.03,
                            "alignment": "right",
                            "fontSize": fontSize,
                            "characterSpacing": 0,
                            "lineHeight": 1
                        };
                    } else {
                        // field
                        // cfdata = [
                        //     slice_age_owner,
                        //     slice_years_since_purchase,
                        //     slice_years_since_construction,
                        //     slice_gpi,
                        //     slice_egi,
                        //     slice_opex,
                        //     slice_noi,
                        //     slice_ads,
                        //     slice_cf,
                        //     slice_loan_principal_year,
                        //     slice_depre_current,
                        //     slice_taxable,
                        //     slice_amount_tax,
                        //     slice_atcf,
                        //     slice_cum_atcf,
                        //     slice_price_sale,
                        //     slice_loan_pv_year,
                        //     slice_sell_bftx,
                        //     slice_fortaxsale,
                        //     slice_tax_transfer,
                        //     slice_sell_aftx,
                        //     slice_cum_profit,
                        //     NPV,
                        //     slice_bank_land,
                        //     slice_bank_building,
                        //     slice_bank_total,
                        //     slice_valuation_inheritance_land,
                        //     slice_valuation_inheritance_building,
                        //     slice_valuation_inheritance_property,
                        //     slice_inheritance_amount,
                        //     slice_inheritance_compression,
                        //     NPV_INHERITANCE,
                        //     slice_depre_total,
                        //     slice_shisan_cash,
                        //     slice_valuation_inheritance_total,
                        //     slice_inheritance_togo,
                        // ];
                        data = cfdata[row - 1][colSum];
                        currentInput["field" + row + '+' + col] = dataToString(data);

                        currentSchema["field" + row + '+' + col] = {
                            "type": "text",
                            "position": {
                                "x": 38.63 + (xUnit * (col - 1)),
                                "y": 20.67 + (yUnit * (row - 1))
                            },
                            "width": 7,
                            "height": 3.03,
                            "alignment": "right",
                            "fontSize": fontSize,
                            "characterSpacing": 0,
                            "lineHeight": 1
                        };
                    }
                }

                for (var row = 0; row <= headers2.length; row++) {
                    if (col == 0) {
                        // 開ける
                        if (row == 0) continue;
                        // header
                        currentInput
                        ["header2-" + row] = headers2[row - 1];

                        currentSchema["header2-" + row] = {
                            "type": "text",
                            "position": {
                                "x": 15.99,
                                "y": 163.53 + (yUnit * (row - 1))
                            },
                            "width": 21.51,
                            "height": 2.76,
                            "alignment": "right",
                            "fontSize": fontSize,
                            "characterSpacing": 0,
                            "lineHeight": 1
                        };
                    } else if (row == 0) {
                        // col year
                        currentInput
                        ["year2-" + col] = '' + years[col - 1];

                        currentSchema["year2-" + col] = {
                            "type": "text",
                            "position": {
                                "x": 38.63 + (xUnit * (col - 1)),
                                "y": 159.5
                            },
                            "width": 7,
                            "height": 3.03,
                            "alignment": "right",
                            "fontSize": fontSize,
                            "characterSpacing": 0,
                            "lineHeight": 1
                        };
                    } else {

                        data = analysisdata[row - 1][colSum];
                        currentInput["field2-" + row + '+' + col] = dataToStringfloat(data);

                        currentSchema["field2-" + row + '+' + col] = {
                            "type": "text",
                            "position": {
                                "x": 38.63 + (xUnit * (col - 1)),
                                "y": 163.53 + (yUnit * (row - 1))
                            },
                            "width": 7,
                            "height": 3.03,
                            "alignment": "right",
                            "fontSize": fontSize,
                            "characterSpacing": 0,
                            "lineHeight": 1
                        };
                    }
                }
                if (col > 0) // header分を引いた数
                    colSum++;
            }
            // new page
            inputs.push(currentInput);
            schemas.push(currentSchema);

            currentInput = {};
            currentSchema = {};
        }
        _this.sheetData = {
            inputs: inputs,
            schemas: schemas
        };
        return resolve();
    })
    //   cfsheet = document.getElementById('cfsheet');
    //   var handsontable_data =
    //   {
    //     data: cfdata,
    //     width: 1920,
    //     height: 860,
    //     type: 'numeric',
    //     format: '000,0',
    //     rowHeaderWidth: 150,
    //     manualRowMove: false,
    //     readonly: true,
    //     rowHeaders: function (index) {
    //       return ['オーナーの年齢（歳）', '購入後年数（年）', '築年数（年）', 'GPI（万円）', 'EGI（万円）', '- OPEX（万円）', '= NOI（万円）', '- ADS（万円）', '= BTCF（万円）', '+ ローン元金（万円）', '- 減価償却費（万円）', '= 課税対象額（万円）', '税額（万円）', 'ATCF（万円）', '累積ATCF（万円）', '売却想定価格（万円）', '期末ローン残債（万円）', '税引前売却手取額（万円）', '譲渡税対象（万円）', '譲渡税（万円）', '税引後売却手取額（万円）', '増加資産（万円）', 'NPV（万円）', '土地積算評価（万円）', '建物積算評価（万円）', '積算評価合計（万円）', '土地相続税評価額（万円）', '建物相続税評価額（万円）', '相続税評価額合計（万円）', '相続税額（万円）', '相続税圧縮額（万円）', '相続税圧縮効果勘案NPV（万円）', '累積償却額（万円）', '現金（万円）', '総相続税評価額（万円）', '相続税納税剰余額（万円）'][index];
    //     },
    //     colHeaders: function (index) {
    //       return slice_year[index];
    //     },

    //   }

    //   //メインシート
    //   var hot = new Handsontable(cfsheet, handsontable_data);////メインシート終わり

    //   //指標シート
    //   var handsontable_analysis_data =
    //   {
    //     data: analysisdata,
    //     width: 1920,
    //     height: 400,
    //     type: 'numeric',
    //     format: '0.00',
    //     rowHeaderWidth: 150,
    //     rowHeaders: function (index) {
    //       return ['表面利回', 'Caprate', 'FCR', 'K%', 'CCR(税引前)', 'CCR(税引後', 'IRR', 'DCR', '相続税圧縮効果勘案IRR'][index];
    //     },
    //     colHeaders: function (index) {
    //       return slice_year[index];
    //     },
    //   }
}

PdfExchange.prototype.makeQR = function () {
    var _this = this;
    return new Promise(function (resolve, reject) {
        console.log('makeQR start');
        var content = "https://souzoku-tool.club/kamakan.html?=" + DATA_SAVE();
        var gQR = "https://chart.apis.google.com/chart?cht=qr&chs=350x350&chl=" + content
        function blobToDataURL(blob, callback) {
            var a = new FileReader();
            a.onload = function (e) { callback(e.target.result); }
            a.readAsDataURL(blob);
        }
        $.ajax({
            url: gQR,
            type: "GET",
            dataType: 'binary',
            responseType: 'arraybuffer',
            processData: false,
            success: function (data, status) {
                console.log('makeQR end', status);
                if (status !== 'success') {
                    return reject(status);
                }
                var blob = new Blob([data], { type: "image/png" });
                blobToDataURL(blob, function (ret) {
                    _this.qrData = ret;
                    resolve();
                })
            }
        })
    })
}

PdfExchange.prototype.sendMail = function () {
    var _this = this;
    var url = this.sendMailUrl;
    return new Promise(function (resolve, reject) {
        console.log('start sendMail')
        var data = new FormData();
        data.append("file", _this.pdfBlob, _this.pdfName);

        $.ajax({
            url: url + '?address=' + encodeURIComponent(_this.email),
            type: "POST",
            processData: false,
            contentType: false,
            success: function (data, status) {
                console.log('sendMail success')
                resolve();
            },
            error(jqXHR, textStatus, errorThrown) {
                // 失敗時の処理
                console.log('sendMail error', textStatus)
                resolve();
            },
            data: data,
            // dataType: 'json'
        })
    })
}

PdfExchange.prototype.genTemplate = function (fontName) {
    console.log('getTemplate');
    const titleFontSize = 10;
    const fontSize = 8;
    var template = {
        "basePdf": this.basePdf,
        "sheetPdf": this.sheetPdf,
        "sheetStartFromPage": this.graphDatas.length + this.basePageNum/* basePdfのページ数 */,
        "schemas": [
            // page 1
{
            "name": {
                "type": "text",
                "position": {
                    "x": 33.34,
                    "y": 14.82
                },
                "width": 70.45,
                "height": 7,
                "alignment": "left",
                "fontSize": 12,
                "characterSpacing": 0,
                "lineHeight": 1
            },
            "price": {
                "type": "text",
                "position": {
                    "x": 146.84,
                    "y": 14.82
                },
                "width": 31.56,
                "height": 7,
                "alignment": "right",
                "fontSize": 12,
                "characterSpacing": 0,
                "lineHeight": 1
            },
            "prefecture": {
                "type": "text",
                "position": {
                    "x": 51.33,
                    "y": 33.34
                },
                "width": 21.5,
                "height": 5.15,
                "alignment": "left",
                "fontSize": 10,
                "characterSpacing": 0,
                "lineHeight": 1
            },
            "address": {
                "type": "text",
                "position": {
                    "x": 75.99,
                    "y": 33.34
                },
                "width": 91.88,
                "height": 4.88,
                "alignment": "left",
                "fontSize": 10,
                "characterSpacing": 0,
                "lineHeight": 1
            },
            "road_price": {
                "type": "text",
                "position": {
                    "x": 51.33,
                    "y": 39.69
                },
                "width": 21.24,
                "height": 4.88,
                "alignment": "right",
                "fontSize": 10,
                "characterSpacing": 0,
                "lineHeight": 1
            },
            "leasehold": {
                "type": "text",
                "position": {
                    "x": 81.81,
                    "y": 39.69
                },
                "width": 35,
                "height": 4.88,
                "alignment": "center",
                "fontSize": 10,
                "characterSpacing": 0,
                "lineHeight": 1
            },
            "initial_years_since_construction": {
                "type": "text",
                "position": {
                    "x": 51.33,
                    "y": 46.04
                },
                "width": 50.34,
                "height": 4.88,
                "alignment": "left",
                "fontSize": 10,
                "characterSpacing": 0,
                "lineHeight": 1
            },
            "construction": {
                "type": "text",
                "position": {
                    "x": 103.99,
                    "y": 46.04
                },
                "width": 35,
                "height": 5.15,
                "alignment": "left",
                "fontSize": 10,
                "characterSpacing": 0,
                "lineHeight": 1
            },
            "purpose": {
                "type": "text",
                "position": {
                    "x": 144.47,
                    "y": 46.04
                },
                "width": 35,
                "height": 4.88,
                "alignment": "left",
                "fontSize": 10,
                "characterSpacing": 0,
                "lineHeight": 1
            },
            "area_land": {
                "type": "text",
                "position": {
                    "x": 51.33,
                    "y": 52.59
                },
                "width": 24.68,
                "height": 4.88,
                "alignment": "right",
                "fontSize": 10,
                "characterSpacing": 0,
                "lineHeight": 1
            },
            "area_building": {
                "type": "text",
                "position": {
                    "x": 106.3,
                    "y": 52.59
                },
                "width": 34.21,
                "height": 5,
                "alignment": "right",
                "fontSize": 10,
                "characterSpacing": 0,
                "lineHeight": 1
            },
            "valuation_propertytax_land": {
                "type": "text",
                "position": {
                    "x": 51.33,
                    "y": 58.5
                },
                "width": 22,
                "height": 5,
                "alignment": "right",
                "fontSize": 10,
                "characterSpacing": 0,
                "lineHeight": 1
            },
            "valuation_propertytax_building": {
                "type": "text",
                "position": {
                    "x": 120.86,
                    "y": 58.5
                },
                "width": 17.8,
                "height": 5,
                "alignment": "right",
                "fontSize": 10,
                "characterSpacing": 0,
                "lineHeight": 1
            },
            "price_land": {
                "type": "text",
                "position": {
                    "x": 51.33,
                    "y": 64.5
                },
                "width": 22,
                "height": 5,
                "alignment": "right",
                "fontSize": 10,
                "characterSpacing": 0,
                "lineHeight": 1
            },
            "price_building": {
                "type": "text",
                "position": {
                    "x": 107.95,
                    "y": 64.5
                },
                "width": 30.77,
                "height": 5,
                "alignment": "right",
                "fontSize": 10,
                "characterSpacing": 0,
                "lineHeight": 1
            },
            "consumpiton_tax": {
                "type": "text",
                "position": {
                    "x": 161.13,
                    "y": 64.5
                },
                "width": 20.7,
                "height": 5,
                "alignment": "right",
                "fontSize": 10,
                "characterSpacing": 0,
                "lineHeight": 1
            },
            "brokerage_fee_i": {
                "type": "text",
                "position": {
                    "x": 51.33,
                    "y": 70.32
                },
                "width": 22,
                "height": 5,
                "alignment": "right",
                "fontSize": 10,
                "characterSpacing": 0,
                "lineHeight": 1
            },
            "brokerage_fee_building": {
                "type": "text",
                "position": {
                    "x": 107.95,
                    "y": 70.32
                },
                "width": 30.77,
                "height": 5,
                "alignment": "right",
                "fontSize": 10,
                "characterSpacing": 0,
                "lineHeight": 1
            },
            "depre_price": {
                "type": "text",
                "position": {
                    "x": 51.33,
                    "y": 76.8
                },
                "width": 22,
                "height": 5,
                "alignment": "right",
                "fontSize": 10,
                "characterSpacing": 0,
                "lineHeight": 1
            },
           "insurance_amount": {
                "type": "text",
                "position": {
                    "x": 44.19,
                    "y": 159.89
                },
                "width": 21.77,
                "height": 5,
                "alignment": "right",
                "fontSize": 10,
                "characterSpacing": 0,
                "lineHeight": 1
            },
            "insurance_fire": {
                "type": "text",
                "position": {
                    "x": 44.19,
                    "y": 166.25
                },
                "width": 21.77,
                "height": 5,
                "alignment": "right",
                "fontSize": 10,
                "characterSpacing": 0,
                "lineHeight": 1
            },
            "insurance_earthquake": {
                "type": "text",
                "position": {
                    "x": 108.74,
                    "y": 166.25
                },
                "width": 21.77,
                "height": 5,
                "alignment": "right",
                "fontSize": 10,
                "characterSpacing": 0,
                "lineHeight": 1
            },
            "insurance_total": {
                "type": "text",
                "position": {
                    "x": 163,
                    "y": 166.25
                },
                "width": 19,
                "height": 5,
                "alignment": "right",
                "fontSize": 10,
                "characterSpacing": 0,
                "lineHeight": 1
            },
            "loan_amount": {
                "type": "text",
                "position": {
                    "x": 28.05,
                    "y": 191.24
                },
                "width": 17.26,
                "height": 5,
                "alignment": "right",
                "fontSize": 10,
                "characterSpacing": 0,
                "lineHeight": 1
            },
            "loan_period": {
                "type": "text",
                "position": {
                    "x": 73.29,
                    "y": 191.24
                },
                "width": 15.14,
                "height": 5,
                "alignment": "right",
                "fontSize": 10,
                "characterSpacing": 0,
                "lineHeight": 1
            },
            "loan_rate": {
                "type": "text",
                "position": {
                    "x": 112.19,
                    "y": 191.24
                },
                "width": 20.18,
                "height": 5,
                "alignment": "right",
                "fontSize": 10,
                "characterSpacing": 0,
                "lineHeight": 1
            },
            "ads": {
                "type": "text",
                "position": {
                    "x": 163,
                    "y": 197.5
                },
                "width": 19,
                "height": 5,
                "alignment": "right",
                "fontSize": 10,
                "characterSpacing": 0,
                "lineHeight": 1
            },
            "kpc": {
                "type": "text",
                "position": {
                    "x": 163,
                    "y": 191.24
                },
                "width": 19,
                "height": 5,
                "alignment": "right",
                "fontSize": 10,
                "characterSpacing": 0,
                "lineHeight": 1
            },
            "units": {
                "type": "text",
                "position": {
                    "x": 34.87,
                    "y": 94.72
                },
                "width": 20.17,
                "height": 5,
                "alignment": "right",
                "fontSize": 10,
                "characterSpacing": 0,
                "lineHeight": 1
            },
            "gpi_room_month": {
                "type": "text",
                "position": {
                    "x": 89.84,
                    "y": 94.72
                },
                "width": 27.84,
                "height": 5,
                "alignment": "right",
                "fontSize": 10,
                "characterSpacing": 0,
                "lineHeight": 1
            },
            "gpi": {
                "type": "text",
                "position": {
                    "x": 161.81,
                    "y": 106.5
                },
                "width": 21.5,
                "height": 5,
                "alignment": "right",
                "fontSize": 10,
                "characterSpacing": 0,
                "lineHeight": 1
            },
            "rate_rent_decline1": {
                "type": "text",
                "position": {
                    "x": 37.52,
                    "y": 106.5
                },
                "width": 9.33,
                "height": 5,
                "alignment": "right",
                "fontSize": 10,
                "characterSpacing": 0,
                "lineHeight": 1
            },
            "rate_rent_decline2": {
                "type": "text",
                "position": {
                    "x": 57,
                    "y": 106.5
                },
                "width": 11.97,
                "height": 5,
                "alignment": "right",
                "fontSize": 10,
                "characterSpacing": 0,
                "lineHeight": 1
            },
            "rate_rent_decline3": {
                "type": "text",
                "position": {
                    "x": 79.43,
                    "y": 106.5
                },
                "width": 11.18,
                "height": 5,
                "alignment": "right",
                "fontSize": 10,
                "characterSpacing": 0,
                "lineHeight": 1
            },
            "rate_rent_decline4": {
                "type": "text",
                "position": {
                    "x": 99.96,
                    "y": 106.5
                },
                "width": 11.71,
                "height": 5,
                "alignment": "right",
                "fontSize": 10,
                "characterSpacing": 0,
                "lineHeight": 1
            },
            "rate_rent_decline5": {
                "type": "text",
                "position": {
                    "x": 122,
                    "y": 106.5
                },
                "width": 11.71,
                "height": 5,
                "alignment": "right",
                "fontSize": 10,
                "characterSpacing": 0,
                "lineHeight": 1
            },
            "occupancy_period": {
                "type": "text",
                "position": {
                    "x": 36.77,
                    "y": 124.5
                },
                "width": 8.79,
                "height": 5,
                "alignment": "right",
                "fontSize": 10,
                "characterSpacing": 0,
                "lineHeight": 1
            },
            "recruitment_period": {
                "type": "text",
                "position": {
                    "x": 80.18,
                    "y": 124.5
                },
                "width": 8.01,
                "height": 5,
                "alignment": "right",
                "fontSize": 10,
                "characterSpacing": 0,
                "lineHeight": 1
            },
            "initial_rate_vacancy": {
                "type": "text",
                "position": {
                    "x": 113.77,
                    "y": 124.5
                },
                "width": 18.86,
                "height": 5,
                "alignment": "right",
                "fontSize": 10,
                "characterSpacing": 0,
                "lineHeight": 1
            },
            "recruitment_cost_month": {
                "type": "text",
                "position": {
                    "x": 42.59,
                    "y": 143
                },
                "width": 7.21,
                "height": 5,
                "alignment": "right",
                "fontSize": 10,
                "characterSpacing": 0,
                "lineHeight": 1
            },
            "recovery_cost_month": {
                "type": "text",
                "position": {
                    "x": 84.29,
                    "y": 143
                },
                "width": 8.54,
                "height": 5,
                "alignment": "right",
                "fontSize": 10,
                "characterSpacing": 0,
                "lineHeight": 1
            },
            "opex_rental_management": {
                "type": "text",
                "position": {
                    "x": 121.44,
                    "y": 143
                },
                "width": 18.33,
                "height": 5,
                "alignment": "right",
                "fontSize": 10,
                "characterSpacing": 0,
                "lineHeight": 1
            },
            "d_rb1": {
                "type": "image",
                "position": {
                    "x": 16.88,
                    "y": 155
                },
                "width": 3,
                "height": 3
            },
            "d_rb2": {
                "type": "image",
                "position": {
                    "x": 37.95,
                    "y": 155
                },
                "width": 3,
                "height": 3
            },
            "d_rb3": {
                "type": "image",
                "position": {
                    "x": 59.21,
                    "y": 155
                },
                "width": 3,
                "height": 3
            },
            "d_rb4": {
                "type": "image",
                "position": {
                    "x": 81.52,
                    "y": 155
                },
                "width": 3,
                "height": 3
            },
            "d_rb5": {
                "type": "image",
                "position": {
                    "x": 103.08,
                    "y": 155
                },
                "width": 3,
                "height": 3
            },
            "d_rb6": {
                "type": "image",
                "position": {
                    "x": 123.91,
                    "y": 155
                },
                "width": 3,
                "height": 3
            },
            "shisan": {
                "type": "text",
                "position": {
                    "x": 27.78,
                    "y": 215.64
                },
                "width": 23.87,
                "height": 4.34,
                "alignment": "right",
                "fontSize": 10,
                "characterSpacing": 0,
                "lineHeight": 1
            },
            "shisan_cash": {
                "type": "text",
                "position": {
                    "x": 80.17,
                    "y": 215.64
                },
                "width": 16.21,
                "height": 5,
                "alignment": "right",
                "fontSize": 10,
                "characterSpacing": 0,
                "lineHeight": 1
            },
            "haigu": {
                "type": "text",
                "position": {
                    "x": 123.29,
                    "y": 215.64
                },
                "width": 20.18,
                "height": 5,
                "alignment": "left",
                "fontSize": 8,
                "characterSpacing": 0,
                "lineHeight": 1
            },
            "kodomo": {
                "type": "text",
                "position": {
                    "x": 164.04,
                    "y": 215.64
                },
                "width": 14.09,
                "height": 5,
                "alignment": "left",
                "fontSize": 10,
                "characterSpacing": 0,
                "lineHeight": 1
            },
            "souzokuzei": {
                "type": "text",
                "position": {
                    "x": 163,
                    "y": 222
                },
                "width": 19,
                "height": 5,
                "alignment": "right",
                "fontSize": 10,
                "characterSpacing": 0,
                "lineHeight": 1
            },
            "inheritance_special_area": {
                "type": "text",
                "position": {
                    "x": 38.37,
                    "y": 221.72
                },
                "width": 14.62,
                "height": 4.35,
                "alignment": "right",
                "fontSize": 10,
                "characterSpacing": 0,
                "lineHeight": 1
            },
            "initial_ownerage": {
                "type": "text",
                "position": {
                    "x": 43.13,
                    "y": 240
                },
                "width": 14.36,
                "height": 5,
                "alignment": "right",
                "fontSize": 10,
                "characterSpacing": 0,
                "lineHeight": 1
            },
            "PorC": {
                "type": "text",
                "position": {
                    "x": 101.6,
                    "y": 240
                },
                "width": 13.83,
                "height": 5,
                "alignment": "left",
                "fontSize": 10,
                "characterSpacing": 0,
                "lineHeight": 1
            },
            "rate_income_tax": {
                "type": "text",
                "position": {
                    "x": 150.02,
                    "y": 240
                },
                "width": 12.25,
                "height": 5,
                "alignment": "right",
                "fontSize": 10,
                "characterSpacing": 0,
                "lineHeight": 1
            },
            "analysis_period": {
                "type": "text",
                "position": {
                    "x": 36.51,
                    "y": 257.7
                },
                "width": 7.75,
                "height": 5,
                "alignment": "right",
                "fontSize": 10,
                "characterSpacing": 0,
                "lineHeight": 1
            },
            "rate_cumlative": {
                "type": "text",
                "position": {
                    "x": 80.43,
                    "y": 263.79
                },
                "width": 8.53,
                "height": 5,
                "alignment": "right",
                "fontSize": 10,
                "characterSpacing": 0,
                "lineHeight": 1
            },
            "discount_rate": {
                "type": "text",
                "position": {
                    "x": 72.5,
                    "y": 257.7
                },
                "width": 15.94,
                "height": 4.35,
                "alignment": "right",
                "fontSize": 10,
                "characterSpacing": 0,
                "lineHeight": 1
            },
            "rate_sale": {
                "type": "text",
                "position": {
                    "x": 120.91,
                    "y": 257.7
                },
                "width": 11.18,
                "height": 5.14,
                "alignment": "right",
                "fontSize": 10,
                "characterSpacing": 0,
                "lineHeight": 1
            },
            "rate_pluscap": {
                "type": "text",
                "position": {
                    "x": 36.52,
                    "y": 263.79
                },
                "width": 9.06,
                "height": 5,
                "alignment": "right",
                "fontSize": 10,
                "characterSpacing": 0,
                "lineHeight": 1
            },
            "egi": {
                "type": "text",
                "position": {
                    "x": 163,
                    "y": 124.5
                },
                "width": 19,
                "height": 5,
                "alignment": "right",
                "fontSize": 10,
                "characterSpacing": 0,
                "lineHeight": 1
            },
            "opex": {
                "type": "text",
                "position": {
                    "x": 163,
                    "y": 172.72
                },
                "width": 19,
                "height": 5,
                "alignment": "right",
                "fontSize": 10,
                "characterSpacing": 0,
                "lineHeight": 1
            },
            "emailadress": {
                "type": "text",
                "position": {
                    "x": 28,
                    "y": 276
                },
                "width": 109.61,
                "height": 4.61,
                "alignment": "left",
                "fontSize": 8,
                "characterSpacing": 0,
                "lineHeight": 1
            }
        },
    
            // page 2
            {
                "name": {
                "type": "text",
                "position": {
                    "x": 33.34,
                    "y": 14.82
                },
                "width": 64.37,
                "height": 7,
                "alignment": "left",
                "fontSize": 12,
                "characterSpacing": 0,
                "lineHeight": 1
            },
            "price": {
                "type": "text",
                "position": {
                    "x": 146.84,
                    "y": 14.82
                },
                "width": 31.56,
                "height": 7,
                "alignment": "right",
                "fontSize": 12,
                "characterSpacing": 0,
                "lineHeight": 1
            },
            "initial_cost": {
                "type": "text",
                "position": {
                    "x": 65,
                    "y": 39
                },
                "width": 32,
                "height": 5,
                "alignment": "right",
                "fontSize": 10,
                "characterSpacing": 0,
                "lineHeight": 1
            },
            "insurance_fire": {
                "type": "text",
                "position": {
                    "x": 65,
                    "y": 166
                },
                "width": 32,
                "height": 5,
                "alignment": "right",
                "fontSize": 10,
                "characterSpacing": 0,
                "lineHeight": 1
            },
            "insurance_earthquake": {
                "type": "text",
                "position": {
                    "x": 65,
                    "y": 172
                },
                "width": 32,
                "height": 5,
                "alignment": "right",
                "fontSize": 10,
                "characterSpacing": 0,
                "lineHeight": 1
            },
            "loan_amount": {
                "type": "text",
                "position": {
                    "x": 65,
                    "y": 112
                },
                "width": 32,
                "height": 5,
                "alignment": "right",
                "fontSize": 10,
                "characterSpacing": 0,
                "lineHeight": 1
            },
            "shisan": {
                "type": "text",
                "position": {
                    "x": 160,
                    "y": 136
                },
                "width": 30,
                "height": 5,
                "alignment": "right",
                "fontSize": 10,
                "characterSpacing": 0,
                "lineHeight": 1
            },
            "souzokuzei": {
                "type": "text",
                "position": {
                    "x": 160,
                    "y": 142
                },
                "width": 30,
                "height": 5,
                "alignment": "right",
                "fontSize": 10,
                "characterSpacing": 0,
                "lineHeight": 1
            },
            "initial_totalcost": {
                "type": "text",
                "position": {
                    "x": 65,
                    "y": 105.5
                },
                "width": 32,
                "height": 5,
                "alignment": "right",
                "fontSize": 10,
                "characterSpacing": 0,
                "lineHeight": 1
            },
            "other_fee": {
                "type": "text",
                "position": {
                    "x": 65,
                    "y": 44.5
                },
                "width": 32,
                "height": 5,
                "alignment": "right",
                "fontSize": 10,
                "characterSpacing": 0,
                "lineHeight": 1
            },
            "registrationtax_transfer": {
                "type": "text",
                "position": {
                    "x": 65,
                    "y": 51
                },
                "width": 32,
                "height": 5,
                "alignment": "right",
                "fontSize": 10,
                "characterSpacing": 0,
                "lineHeight": 1
            },
            "brokerage_fee": {
                "type": "text",
                "position": {
                    "x": 65,
                    "y": 75
                },
                "width": 32,
                "height": 5,
                "alignment": "right",
                "fontSize": 10,
                "characterSpacing": 0,
                "lineHeight": 1
            },
            "registrationtax_mortgage": {
                "type": "text",
                "position": {
                    "x": 65,
                    "y": 56.5
                },
                "width": 32,
                "height": 5,
                "alignment": "right",
                "fontSize": 10,
                "characterSpacing": 0,
                "lineHeight": 1
            },
            "acquisitiontax_land": {
                "type": "text",
                "position": {
                    "x": 65,
                    "y": 63
                },
                "width": 32,
                "height": 5,
                "alignment": "right",
                "fontSize": 10,
                "characterSpacing": 0,
                "lineHeight": 1
            },
            "acquisitiontax_building": {
                "type": "text",
                "position": {
                    "x": 65,
                    "y": 69
                },
                "width": 32,
                "height": 5,
                "alignment": "right",
                "fontSize": 10,
                "characterSpacing": 0,
                "lineHeight": 1
            },
            "legal_fee": {
                "type": "text",
                "position": {
                    "x": 65,
                    "y": 81
                },
                "width": 32,
                "height": 5,
                "alignment": "right",
                "fontSize": 10,
                "characterSpacing": 0,
                "lineHeight": 1
            },
            "bank_fee": {
                "type": "text",
                "position": {
                    "x": 65,
                    "y": 87
                },
                "width": 32,
                "height": 5,
                "alignment": "right",
                "fontSize": 10,
                "characterSpacing": 0,
                "lineHeight": 1
            },
            "Stamptax_transfer": {
                "type": "text",
                "position": {
                    "x": 65,
                    "y": 93
                },
                "width": 32,
                "height": 5,
                "alignment": "right",
                "fontSize": 10,
                "characterSpacing": 0,
                "lineHeight": 1
            },
            "stamptax_loan": {
                "type": "text",
                "position": {
                    "x": 65,
                    "y": 99
                },
                "width": 32,
                "height": 5,
                "alignment": "right",
                "fontSize": 10,
                "characterSpacing": 0,
                "lineHeight": 1
            },
            "result_initial_totalcost": {
                "type": "text",
                "position": {
                    "x": 160,
                    "y": 172.5
                },
                "width": 30,
                "height": 5,
                "alignment": "right",
                "fontSize": 10,
                "characterSpacing": 0,
                "lineHeight": 1
            },
            "equity": {
                "type": "text",
                "position": {
                    "x": 65,
                    "y": 118
                },
                "width": 32,
                "height": 5,
                "alignment": "right",
                "fontSize": 10,
                "characterSpacing": 0,
                "lineHeight": 1
            },
            "Opex_sum": {
                "type": "text",
                "position": {
                    "x": 65,
                    "y": 136
                },
                "width": 32,
                "height": 5,
                "alignment": "right",
                "fontSize": 10,
                "characterSpacing": 0,
                "lineHeight": 1
            },
            "Opex_total_rate": {
                "type": "text",
                "position": {
                    "x": 65,
                    "y": 142
                },
                "width": 32,
                "height": 5,
                "alignment": "right",
                "fontSize": 10,
                "characterSpacing": 0,
                "lineHeight": 1
            },
            "opex_other": {
                "type": "text",
                "position": {
                    "x": 65,
                    "y": 148
                },
                "width": 32,
                "height": 5,
                "alignment": "right",
                "fontSize": 10,
                "characterSpacing": 0,
                "lineHeight": 1
            },
            "Amount_propertytax_land": {
                "type": "text",
                "position": {
                    "x": 65,
                    "y": 153.6
                },
                "width": 32,
                "height": 5,
                "alignment": "right",
                "fontSize": 10,
                "characterSpacing": 0,
                "lineHeight": 1
            },
            "amount_propertytax_building": {
                "type": "text",
                "position": {
                    "x": 65,
                    "y": 160
                },
                "width": 32,
                "height": 5,
                "alignment": "right",
                "fontSize": 10,
                "characterSpacing": 0,
                "lineHeight": 1
            },
            "opex_rental_management_amount": {
                "type": "text",
                "position": {
                    "x": 65,
                    "y": 178
                },
                "width": 32,
                "height": 5,
                "alignment": "right",
                "fontSize": 10,
                "characterSpacing": 0,
                "lineHeight": 1
            },
            "opex_building_management_amount": {
                "type": "text",
                "position": {
                    "x": 65,
                    "y": 184
                },
                "width": 32,
                "height": 5,
                "alignment": "right",
                "fontSize": 10,
                "characterSpacing": 0,
                "lineHeight": 1
            },
            "opex_facility": {
                "type": "text",
                "position": {
                    "x": 65,
                    "y": 190
                },
                "width": 32,
                "height": 5,
                "alignment": "right",
                "fontSize": 10,
                "characterSpacing": 0,
                "lineHeight": 1
            },
            "opex_water": {
                "type": "text",
                "position": {
                    "x": 65,
                    "y": 196
                },
                "width": 32,
                "height": 5,
                "alignment": "right",
                "fontSize": 10,
                "characterSpacing": 0,
                "lineHeight": 1
            },
            "opex_recruitmentcost": {
                "type": "text",
                "position": {
                    "x": 65,
                    "y": 202.6
                },
                "width": 32,
                "height": 5,
                "alignment": "right",
                "fontSize": 10,
                "characterSpacing": 0,
                "lineHeight": 1
            },
            "Opex_recoverycost": {
                "type": "text",
                "position": {
                    "x": 65,
                    "y": 208
                },
                "width": 32,
                "height": 5,
                "alignment": "right",
                "fontSize": 10,
                "characterSpacing": 0,
                "lineHeight": 1
            },
            "result_gpi": {
                "type": "text",
                "position": {
                    "x": 160,
                    "y": 39
                },
                "width": 30,
                "height": 5,
                "alignment": "right",
                "fontSize": 10,
                "characterSpacing": 0,
                "lineHeight": 1
            },
            "result_egiresult_egi": {
                "type": "text",
                "position": {
                    "x": 160,
                    "y": 45
                },
                "width": 30,
                "height": 5,
                "alignment": "right",
                "fontSize": 10,
                "characterSpacing": 0,
                "lineHeight": 1
            },
            "result_opex": {
                "type": "text",
                "position": {
                    "x": 160,
                    "y": 51
                },
                "width": 30,
                "height": 5,
                "alignment": "right",
                "fontSize": 10,
                "characterSpacing": 0,
                "lineHeight": 1
            },
            "result_noi": {
                "type": "text",
                "position": {
                    "x": 160,
                    "y": 57
                },
                "width": 30,
                "height": 5,
                "alignment": "right",
                "fontSize": 10,
                "characterSpacing": 0,
                "lineHeight": 1
            },
            "result_ads": {
                "type": "text",
                "position": {
                    "x": 160,
                    "y": 63
                },
                "width": 30,
                "height": 5,
                "alignment": "right",
                "fontSize": 10,
                "characterSpacing": 0,
                "lineHeight": 1
            },
            "result_btcf": {
                "type": "text",
                "position": {
                    "x": 160,
                    "y": 69.5
                },
                "width": 30,
                "height": 5,
                "alignment": "right",
                "fontSize": 10,
                "characterSpacing": 0,
                "lineHeight": 1
            },
            "result_surplus": {
                "type": "text",
                "position": {
                    "x": 160,
                    "y": 87.5
                },
                "width": 30,
                "height": 5,
                "alignment": "right",
                "fontSize": 10,
                "characterSpacing": 0,
                "lineHeight": 1
            },
            "result_caprate": {
                "type": "text",
                "position": {
                    "x": 160,
                    "y": 93.5
                },
                "width": 30,
                "height": 5,
                "alignment": "right",
                "fontSize": 10,
                "characterSpacing": 0,
                "lineHeight": 1
            },
            "result_fcr": {
                "type": "text",
                "position": {
                    "x": 160,
                    "y": 99.5
                },
                "width": 30,
                "height": 5,
                "alignment": "right",
                "fontSize": 10,
                "characterSpacing": 0,
                "lineHeight": 1
            },
            "result_kpc": {
                "type": "text",
                "position": {
                    "x": 160,
                    "y": 105.5
                },
                "width": 30,
                "height": 5,
                "alignment": "right",
                "fontSize": 10,
                "characterSpacing": 0,
                "lineHeight": 1
            },
            "result_ccr": {
                "type": "text",
                "position": {
                    "x": 160,
                    "y": 111.5
                },
                "width": 30,
                "height": 5,
                "alignment": "right",
                "fontSize": 10,
                "characterSpacing": 0,
                "lineHeight": 1
            },
            "result_dcr": {
                "type": "text",
                "position": {
                    "x": 160,
                    "y": 118
                },
                "width": 30,
                "height": 5,
                "alignment": "right",
                "fontSize": 10,
                "characterSpacing": 0,
                "lineHeight": 1
            },
            "valuation_inheritance_property": {
                "type": "text",
                "position": {
                    "x": 160,
                    "y": 148
                },
                "width": 30,
                "height": 5,
                "alignment": "right",
                "fontSize": 10,
                "characterSpacing": 0,
                "lineHeight": 1
            },
            "valuation_inheritance_building": {
                "type": "text",
                "position": {
                    "x": 160,
                    "y": 154
                },
                "width": 30,
                "height": 5,
                "alignment": "right",
                "fontSize": 10,
                "characterSpacing": 0,
                "lineHeight": 1
            },
            "special_area_amount": {
                "type": "text",
                "position": {
                    "x": 160,
                    "y": 160
                },
                "width": 30,
                "height": 5,
                "alignment": "right",
                "fontSize": 10,
                "characterSpacing": 0,
                "lineHeight": 1
            },
            "valuation_inheritance_land": {
                "type": "text",
                "position": {
                    "x": 160,
                    "y": 166
                },
                "width": 30,
                "height": 5,
                "alignment": "right",
                "fontSize": 10,
                "characterSpacing": 0,
                "lineHeight": 1
            },
            "valuation_inheritance_compression": {
                "type": "text",
                "position": {
                    "x": 160,
                    "y": 178
                },
                "width": 30,
                "height": 5,
                "alignment": "right",
                "fontSize": 10,
                "characterSpacing": 0,
                "lineHeight": 1
            },
            "valuation_inheritance_after": {
                "type": "text",
                "position": {
                    "x": 160,
                    "y": 184
                },
                "width": 30,
                "height": 5,
                "alignment": "right",
                "fontSize": 10,
                "characterSpacing": 0,
                "lineHeight": 1
            },
            "after_souzokuzei": {
                "type": "text",
                "position": {
                    "x": 160,
                    "y": 190
                },
                "width": 30,
                "height": 5,
                "alignment": "right",
                "fontSize": 10,
                "characterSpacing": 0,
                "lineHeight": 1
            },
            "amount_inheritance_compression": {
                "type": "text",
                "position": {
                    "x": 160,
                    "y": 196.5
                },
                "width": 30,
                "height": 5,
                "alignment": "right",
                "fontSize": 10,
                "characterSpacing": 0,
                "lineHeight": 1
            },
            "QR": {
                "type": "image",
                "position": {
                    "x": 17.99,
                    "y": 219.39
                },
                "width": 40,
                "height": 40
            },
            "map": {
                "type": "image",
                "position": {
                    "x": 111.39,
                    "y": 208.02
                },
                "width": 86.06,
                "height": 72
            }
        },
          
            
        ]
    };

    for (var j = 0; j < this.graphDatas.length; j++) {
        template.schemas.push({
            "graph": {
                "type": "image",
                "position": {
                    "x": 19.73,
                    "y": 26
                },
                "height": 169.58,
                "width": 256.16,
                "alignment": "left",
                "fontSize": 20,
                "characterSpacing": 0,
                "lineHeight": 1
            },
            "title": {
                "type": "text",
                "position": {
                    "x": 18.15,
                    "y": 6.24
                },
                "width": 300,
                "height": 6.27,
                "alignment": "left",
                "fontSize": 14,
                "characterSpacing": 0,
                "lineHeight": 1
            }
        })
    }
    if (this.sheetData && this.sheetData.schemas)
        template.schemas = template.schemas.concat(this.sheetData.schemas);

    for (var i = 0; i < template.schemas.length; i++) {
        for (var key in template.schemas[i]) {
            if (template.schemas[i])
                template.schemas[i][key].fontName = fontName;
        }
    }
    console.log('schemas', JSON.stringify(template.schemas));
    return template;
}

PdfExchange.prototype.genInputs = function (mapImage) {
    console.log('genInputs');
    var inputs = [{
        "name": $('#name_property').val(),
        "price": $('#price_property').val(),
        // TODO: 数字をなおす
        "prefecture": $('#prefectures option:selected').text(), // "千葉県",
        "address": $('#address_property').val(), //"住所",
        "url_rosenka": $('#url_rosenka').val(), //"路線価URL",
        "road_price": $('#road_price').val(), //"路線価",
        "leasehold": $('#leasehold option:selected').text(), //"借地権割合",
       
        "area_land": $('#area_land').val(), // "土地面積",
        "area_building": $('#area_building').val(), //"建物面積",
        "initial_years_since_construction": $('#initial_years_since_construction option:selected').text(),//"建築年",
        // construction_table
        "construction": $('#construction option:selected').text(),// "建物構造", 
        "purpose": $('#purpose option:selected').text(),//"建物の種類",
        "valuation_propertytax_land": $('#valuation_propertytax_land').val(), // "土地価額", 
        // f($('#auto_valuation_propertytax_building').prop("checked")) -> checkをどうするか
        "valuation_propertytax_building": $('#valuation_propertytax_building').val(), // "建物価額"
        "price_land": $('#price_land').val(), // "土地価額"
        "price_building": $('#price_building').val(), //"建物価額", 
        "consumpiton_tax": $('#consumpiton_tax').val(), // "消費税", 
        "brokerage_fee_i": $('#brokerage_fee_i').val(), // "土地建物仲介手数料", 
        "brokerage_fee_building": $('#brokerage_fee_building').val(), //"建物仲介手数料", 
        "depre_price": $('#depre_price').val(), // "減価償却対象合計額", 
        "insurance_amount": $('#insurance_amount').val(), //"火災保険加入額", 
        "insurance_fire": $('.insurance_fire').val(), //"火災保険担年", 
        "insurance_earthquake": $('.insurance_earthquake').val(), // "地震保険担年", 
        "insurance_total": $('.insurance_total').val(), //"保険料合計担年" 

        "loan_amount": $('#loan_amount').val(),

        "loan_period": $('#loan_period').val(),
        "loan_rate": $('#loan_rate').val(),
        "ads": $('#ads').val(),
        "kpc": $('#kpc').val(),
        "units": $('#units').val(),
        "gpi_room_month": $('#gpi_room_month').val(),
        "gpi": $('#gpi').val(),
        "rate_rent_decline1": $('#rate_rent_decline1').val(),
        "rate_rent_decline2": $('#rate_rent_decline2').val(),
        "rate_rent_decline3": $('#rate_rent_decline3').val(),
        "rate_rent_decline4": $('#rate_rent_decline4').val(),
        "rate_rent_decline5": $('#rate_rent_decline5').val(),
        "occupancy_period": $('#occupancy_period').val(),
        "recruitment_period": $('#recruitment_period').val(),
        "initial_rate_vacancy": $('#initial_rate_vacancy').val(),
        "recruitment_cost_month": $('#recruitment_cost_month').val(),
        "recovery_cost_month": $('#recovery_cost_month').val(),
        "opex_rental_management": $('#opex_rental_management').val(),
        "shisan": $('#shisan').val(),
        "shisan_cash": $('#shisan_cash').val(),
        "haigu": $('#haigu option:selected').text(), // "配偶者の有無",
        "kodomo": $('#kodomo option:selected').text(), // "子の数",
        "souzokuzei": $('#souzokuzei').val(),
        "inheritance_special_area": $('#inheritance_special_area').val(),
        "d_rb1": $('#d_rb1').prop("checked") ? this.checkboxImage : "",
        "d_rb2": $('#d_rb2').prop("checked") ? this.checkboxImage : "",
        "d_rb3": $('#d_rb3').prop("checked") ? this.checkboxImage : "",
        "d_rb4": $('#d_rb4').prop("checked") ? this.checkboxImage : "",
        "d_rb5": $('#d_rb5').prop("checked") ? this.checkboxImage : "",
        "d_rb6": $('#d_rb6').prop("checked") ? this.checkboxImage : "",
         "initial_ownerage": $('#initial_ownerage').val(),//"オーナーの年齢",
        "PorC": $('#PorC option:selected').text(),//"購入名義",
        "rate_income_tax": $('#rate_income_tax').val(), //"所得税等税率",
        "comment": $('#comment').val(), // "コメント",
        "analysis_period": $('#analysis_period').val(), //"分析期間",
        "discount_rate": $('#discount_rate').val(),//"割引率",
        "rate_pluscap": $('#rate_pluscap').val(),//"売却時CR加算率",
        "rate_sale": $('#rate_sale').val(), //"売却時経費率",
        "rate_cumlative": $('#rate_cumlative').val(), //"土地積算評価割戻率",
        "opex":$('#Opex_sum').val(),
        "egi":$('.result_egi').val(),
        "emailadress":$('#inlineFormInputName').val() + '@' + $('#inlineFormInputGroupUsername').val(),
    }
        , {
        "name": $('#name_property').val(),
        "price": $('#price_property').val(),
        "price_property": $('#price_property').val(),
        "initial_cost": $('#initial_cost').val(), //"物件価格", 
        "other_fee": $('#other_fee').val(), //"その他の初期費用", 
        "registrationtax_transfer": $('#registrationtax_transfer').val(), //"登録免許税（所有権移転）", 
        "registrationtax_mortgage": $('#registrationtax_mortgage').val(), //"登録免許税（抵当権設定）", 
        "acquisitiontax_land": $('#acquisitiontax_land').val(), //"不動産取得税（土地）", 
        "acquisitiontax_building": $('#acquisitiontax_building').val(), //"不動産取得税（建物）", 
        "brokerage_fee": $('#brokerage_fee').val(), //"仲介手数料", 
        "legal_fee": $('#legal_fee').val(), //"司法書士手数料", 
        "bank_fee": $('#bank_fee').val(), //"銀行手数料", 
        "Stamptax_transfer": $('#Stamptax_transfer').val(), //"印紙代1", 
        "stamptax_loan": $('#stamptax_loan').val(), //"印紙代2", 
        "initial_totalcost": $('#initial_totalcost').val(), // TODO: "物件価格＋購入経費", 
        "loan_amount": $('.loan_amount').val(), // "銀行借入額", 
        "equity": $('#equity').val(), //投入自己資金", 
        "Opex_sum": $("#Opex_sum").val(), // "運営費用合計", 
        "Opex_total_rate": $("#Opex_total_rate").val(), //"運営費用率", 
        "opex_other": $("#opex_other").val(), //"その他の運営費用", 
        "Amount_propertytax_land": $("#Amount_propertytax_land").val(), //"固定資産税額：土地", 
        "amount_propertytax_building": $("#amount_propertytax_building").val(), // "固定資産税額：建物", 
        "insurance_fire": $("#insurance_fire").val(), // "火災保険料", 
        "insurance_earthquake": $("#insurance_earthquake").val(), // "地震保険料", 
        "opex_rental_management_amount": $("#opex_rental_management_amount").val(), // "賃貸管理費", 
        "opex_building_management_amount": $("#opex_building_management_amount").val(), //"清掃・消防点検", 
        "opex_facility": $("#opex_facility").val(), //"設備管理費", 
        "opex_water": $("#opex_water").val(),  // "共用電気水道代", 
        "opex_recruitmentcost": $("#opex_recruitmentcost").val(),// "賃貸募集費用", 
        "Opex_recoverycost": $("#Opex_recoverycost").val(), //"原状回復費用", 
        "result_price_property": $('.result_price_property').val(), // "物件購入価格", 
        "result_initial_cost": $('.result_initial_cost').val(), // "物件購入価格", 
        "result_initial_totalcost": $('.result_initial_totalcost').val(), //"購入総経費", 
        "result_loan_amount": $('.result_loan_amount').val(), //"銀行借入", 
        "result_equity": $('.result_equity').val(), // "自己資金", 
        "result_gpi": $('.result_gpi').val(), // "総潜在収入", 
        "result_egiresult_egi": $('.result_egi').val(), // "実効総収入", 
        "result_opex": $('.result_opex').val(), //"運営費", 
        "result_noi": $('.result_noi').val(), //"営業純利益", 
        "result_ads": $('.result_ads').val(), //"年間ローン返済額", 
        "result_btcf": $('.result_btcf').val(), //"税引前キャッシュ", 
        "result_surplus": $('.result_surplus').val(), //"表面利回", 
        "result_caprate": $('.result_caprate').val(),//"キャップレート", 
        "result_fcr": $('.result_fcr').val(), //"総収益率", 
        "result_kpc": $('.result_kpc').val(), //"ローン係数", 
        "result_ccr": $('.result_ccr').val(), //"自己資金利回", 
        "result_dcr": $('.result_dcr').val(), //"安全率（DCR）", 
        "shisan": $('.shisan').val(), //"購入前相続税評価額", 
        "souzokuzei": $('#souzokuzei').val(), //"購入前相続税額", 
        "valuation_inheritance_property": $('#valuation_inheritance_property').val(), //"相続税評価額", 
        "valuation_inheritance_building": $('#valuation_inheritance_building').val(), //"建物相続税評価額", 
        "special_area_amount": $('#special_area_amount').val(), //"小規模宅地特例", 
        "valuation_inheritance_land": $('#valuation_inheritance_land').val(), //"土地相続税評価額", 
        "valuation_inheritance_compression": $('#valuation_inheritance_compression').val(), // "相続税評価圧縮額", 
        "valuation_inheritance_after": $('#valuation_inheritance_after').val(), //"購入直後相", 
        "after_souzokuzei": $('#after_souzokuzei').val(), //"購入直後相続税額", 
        "amount_inheritance_compression": $('#amount_inheritance_compression').val(), //"相続税圧縮額", 
        "QR": this.qrData || '',
        "map": mapImage || ''
    },
  
    ]

    for (var j = 0; j < this.graphDatas.length; j++) {
        inputs.push(this.graphDatas[j]);
    }
    if (this.sheetData && this.sheetData.inputs) {
        inputs = inputs.concat(this.sheetData.inputs);
    }
    console.log(JSON.stringify(inputs));
    return inputs;
}

PdfExchange.prototype.checkboxImage = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA0AAAANCAYAAABy6+R8AAAABmJLR0QA7gDuAO6KafAUAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAB3RJTUUH5QMFAxUvZAHPZwAAAB1pVFh0Q29tbWVudAAAAAAAQ3JlYXRlZCB3aXRoIEdJTVBkLmUHAAAA4UlEQVQoz2OcdODb/6YDnAxvvjIQBCLcDAx1Dt8ZGEUa/v8nRgOyRiZCGgQ4GRj2pzMwBGhD+G++MjAwETJ5gh8Dg4MyA8OCcIQYXk0FtgwM8cYQtsMMHJoEOBFsB2UGhn5fCDtxFQPDhWdYNCWYMDDcr2BgMJBiYFAQZGBYHwcRX3iWgWHBGVQXsCA7BebpB+8h7IvPGRgSVmI6G26TwwyIIgFOiG0ff6D6A6umD98RGmGGfPiOXRMjQ+n//+iB4aDEwLDhKu5QZRLhRhX48B2/BhFuBgamOofvDOgaCaU9AEo7QGgJNmWFAAAAAElFTkSuQmCC";


function Snackbar() {
    this.view = document.body.appendChild(document.createElement('div'));
    this.view.classList.add('snackbar');
    this.isActive = false;
    this.queue = [];
    this.gap = 250;
    this.duration = 5000;
}

Snackbar.prototype.show = function (message) {
    var _this = this;

    if (this.isActive) {
        this.queue.push(message);
        return;
    }
    this.isActive = true;
    this.view.textContent = message;
    this.view.classList.add('snackbar--visible');
    this.queue.shift();
    setTimeout(function () {
        return _this.hide();
    }, this.duration);
};

Snackbar.prototype.hide = function () {
    var _this2 = this;

    this.isActive = false;
    this.view.classList.remove('snackbar--visible');

    if (this.queue.length) {
        setTimeout(function () {
            return _this2.show(_this2.queue[0]);
        }, this.gap);
    }
};
