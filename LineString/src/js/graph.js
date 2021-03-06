const { Kafka } = require("kafkajs");

/**
 * Parameters
 */
// グラフデータ
let g_jsonGeometories = [[]];

// グラフ線の色
const g_colors = ["#4E79A7","#F28E2B","#E15759","#76B7B2","#59A14F","#EDC948","#B07AA1","#FF9DA7","#9C755F","#BAB0AC"];
// グラフ塗りつぶし色
const g_colorsBackGround = ["#CCD8E5","#FBDEC2","#F6CFCF","#D7EAE9","#CFE4CC","#F9EFCA","#E8D9E4","#FFE3E5","#E2D7D1","#EBE8E7"];
// 白色
const g_colorWhite = "#FFFFFF";

/**
 * Global variable
 */
// Chartオブジェクト
let g_chart = null;

// スライダーつまみ位置
let g_sliderLow = 0;
let g_sliderHigh = -1;

// スライダーインデックス数
let g_sliderMax = (DATA_LIMIT < 100) ? 100 : DATA_LIMIT;

// 現在受信中のタイムスタンプ
let g_timestamp = '';

// 受信中データのインデックス
let g_jsonIndex = -1;

// 処理中受信メッセージ
g_message = '';


/**
 * Methods
 */
 window.addEventListener('DOMContentLoaded', onLoad);

/**
 * Window描画時の処理
 */
function onLoad() {
    kafkaConsumer();
}

/**
 * Kafka Consumer起動
 */
async function kafkaConsumer() {
    const kafka = new Kafka({
        clientId: "app",
        brokers: [KAFKA_SERVER + ':' + KAFKA_SERVER_PORT],
    });
    
    const consumer = kafka.consumer({ groupId: '3' });
    
    await consumer.connect();
    await consumer.subscribe({ topic: KAFKA_TOPIC_NAME, fromBeginning: true });
      
    await consumer.run({
        eachMessage: async ({topic, partition, message}) => {
             // 前回と同じメッセージであれば処理を行わない
            if (g_message == message) {
                console.log('Same Massage !!');
                return;
            }
            // メッセージを保存
            g_message = message;
            // 受信データからGeoJSON配列作成
            pushGeoJSONData(message);
            // グラフ描画（パラメータ：表示位置のスライダーmin値、スライダーmax値）
            createGraph(g_sliderLow, g_jsonGeometories.length - 1, 0, 0, true);
        },
    });
}

/**
 * 受信したGeoJSON文字列を解析し、GeoJSONデータとして蓄積する
 * @param {string} msg 受信データ
 */
function pushGeoJSONData(msg) {
    const stringfyMsg = JSON.stringify(msg.value.toString());
    const objMsg = JSON.parse(stringfyMsg);
    const objGeometry = JSON.parse(objMsg);
    const timestamp = objGeometry.properties.timestamp;
    // タイムスタンプに変更がなければ
    if (timestamp == g_timestamp) {
        // GeoJSONデータ保存
        g_jsonGeometories[g_jsonIndex].push(objGeometry);
    }
    // タイムスタンプに変更がある
    else {
        // データ保存容量を超える
        if (g_jsonIndex + 1 >= DATA_LIMIT) {
            // 先頭のデータを削除
            g_jsonGeometories.shift();
        }
        // データ保存容量を超えない
        else {
            g_jsonIndex++;
        }
        // タイムスタンプ更新
        g_timestamp = timestamp;
        // GeoJSONデータ保存
        g_jsonGeometories[g_jsonIndex] = [];
        g_jsonGeometories[g_jsonIndex].push(objGeometry);
    }
}

/**
 * 連想配列にタイムスタンプを追加する
 * @param {Object} obj 指定連想配列
 * @param {string} oId OID
 * @param {string} timestamp 追加するタイムスタンプ
 */
 function setOidTimstampToObj(obj, oId, timestamp) {
    // 指定OIDが登録されていない
    if (obj[oId] === undefined) {
        obj[oId] = [];
    }
    obj[oId].push(timestamp);
}

/**
 * 各データにラベルを設定する。
 * ラベルに'None'を設定すると凡例を出力しないようになる。
 * @param {Object} datasets data.datasets
 * @param {Object} arrOidTimestamp OIDをキーとしてタイムスタンプ配列を格納した連想配列
 */
function setDatasetLabels(datasets, arrOidTimestamp) {
    let oidSet = new Set();
    datasets.forEach(dataset => {
        // 各オブジェクトにラベル（凡例用）設定
        for (oId in arrOidTimestamp) {
            // 同じOID
            if (dataset.label == 'oID:' + oId) {
                // そのOIDのラベルを設定していない
                if (!oidSet.has(oId)) {
                    dataset.label = 'oID:' + oId + ' ';
                    oidSet.add(oId);
                }
                // 一度ラベル設定済み
                else {
                    dataset.label = 'None';
                }
            }
        }
    });
}

/**
 * 色のインデックスを取得する
 * @param {string} oId OID
 * @param {Object} arrColorsOid g_colorsに対応した配列でそのOIDの色のインデックスにOIDが格納されている
 * @returns {number} 指定OIDが使うべきg_colorsのインデックス
 */
function getColorIndex(oId, arrColorsOid) {
    let registerMax = 0;
    // g_colors登録数分チェック
    for (let i = 0; i < g_colors.length; i++) {
        // まだその色は使われていない
        if (arrColorsOid[i] === undefined) {
            arrColorsOid[i] = [];
            arrColorsOid[i].push(oId);
            return i;
        }
        // その色は使われている
        else {
            // 登録されているか探す
            for (let j = 0; j < arrColorsOid[i].length; j++) {
                // 登録されていればその色を返す
                if (arrColorsOid[i][j] === oId) {
                    return i;
                }
            }
        }
        // 登録されている最大数
        if (registerMax < arrColorsOid[i].length) {
            registerMax = arrColorsOid[i].length;
        }
    }
    // 最も登録数が少ない色をテーブル先頭から探す
    for (let i = 0; i < Object.keys(arrColorsOid).length; i++) {
        // その色が最大登録済み数より少ない登録数
         if (registerMax > arrColorsOid[Number(Object.keys(arrColorsOid)[i])].length) {
            arrColorsOid[i].push(oId);
            return i;
        }
    }
    // すべて同じ登録数
    arrColorsOid[0].push(oId);
    return 0;
}

/**
 * 多重Polygonの表示順序（前面／背面）設定
 * @param {number} order 設定中Geometryの何番目か
 * @param {Object} datasets dataset配列
 * @param {number} index dataset配列のインデックス
 * @param {array} x_min X座病最小値の配列
 * @param {array} x_max X座病最大値の配列
 * @param {string} color 塗りつぶし色
 */
function setGeometryOrder(order, datasets, index, x_min, x_max, color) {
    // Geometryが複数の場合
    if (order > 0) {
        // 面積（X座標の範囲）が小さければ前面に表示
        if ((x_max[order] - x_min[order]) < (x_max[order-1] - x_min[order-1])) {
            datasets[index].order = 1;      // 前面
            datasets[index].backgroundColor = g_colorWhite;
            datasets[index-1].order = 2;    // 背面
            datasets[index-1].backgroundColor = color;
        }
        // 面積（X座標の範囲）が大きければ背面に表示
        else {
            datasets[index].order = 2;      // 背面
            datasets[index].backgroundColor = color;
            datasets[index-1].order = 1;    // 前面
            datasets[index-1].backgroundColor = g_colorWhite;
        }
    }
    // Geometryが1個のみの場合
    else {
        datasets[index].backgroundColor = color;
    }
}

/**
 * LineString の dataObj.datasets を設定する
 * @param {Object} dataObj dataObj
 * @param {array} objLineStrings LineStringのGeoJSONデータ
 * @param {array} arrOidTimestamp OIDを格納しているg_colorsに対応する配列（そのOIDがどの色か）
 * @param {array} arrOidColors  OIDを格納しているg_colorsに対応する配列（そのOIDがどの色か）
 * @param {number} indexData datasetsのインデックス
 * @param {array} x xの配列
 * @param {array} y yの配列
 * @returns {number} indexData
 */
function setLineStringDatasets(dataObj, objLineStrings, arrOidTimestamp, arrOidColors, indexData, x, y) {
    // OIDとタイムスタンプを一旦保存
    setOidTimstampToObj(
        arrOidTimestamp, objLineStrings.properties.oID, objLineStrings.properties.timestamp);
    dataObj.datasets[indexData] = new Object();
    let oId = objLineStrings.properties.oID;
    dataObj.datasets[indexData].label = 'oID:' + oId;
    dataObj.datasets[indexData].data = [];
    // Coordinateを取得 
    for (let k = 0; k < objLineStrings.geometry.coordinates.length; k++) {
        x.push(objLineStrings.geometry.coordinates[k][0]);
        y.push(objLineStrings.geometry.coordinates[k][1]);
        let data = new Object();
        data.x = objLineStrings.geometry.coordinates[k][0];
        data.y = objLineStrings.geometry.coordinates[k][1];
        dataObj.datasets[indexData].data.push(data);
    }
    // Geometryの各種表示用設定
    dataObj.datasets[indexData].borderColor = g_colors[getColorIndex(oId, arrOidColors)];
    dataObj.datasets[indexData].borderWidth = 2;
    dataObj.datasets[indexData].pointBackgroundColor = g_colors[getColorIndex(oId, arrOidColors)];
    dataObj.datasets[indexData].pointBorderColor = g_colors[getColorIndex(oId, arrOidColors)];
    dataObj.datasets[indexData].pointRadius = 1;
    dataObj.datasets[indexData].pointHoverRadius = 1;
    dataObj.datasets[indexData].fill = false;
    dataObj.datasets[indexData].tension = 0;
    dataObj.datasets[indexData].showLine = true;   
    return indexData;
}

/**
 * Polygon の dataObj.datasets を設定する
 * @param {Object} dataObj dataObj
 * @param {array} objPolygon PolygonのGeoJSONデータ
 * @param {array} arrOidTimestamp OIDを格納しているg_colorsに対応する配列（そのOIDがどの色か）
 * @param {array} arrOidColors  OIDを格納しているg_colorsに対応する配列（そのOIDがどの色か）
 * @param {number} indexData datasetsのインデックス
 * @param {array} x xの配列
 * @param {array} y yの配列
 * @returns {number} indexData
 */
function setPolygonDatasets(dataObj, objPolygon, arrOidTimestamp, arrOidColors, indexData, x, y) {
    // OIDとタイムスタンプを一旦保存
    setOidTimstampToObj(
        arrOidTimestamp, objPolygon.properties.oID, objPolygon.properties.timestamp);
    let x_max = [Number.MIN_VALUE, Number.MIN_VALUE];
    let x_min = [Number.MAX_VALUE, Number.MAX_VALUE];
    let oId = objPolygon.properties.oID;
    let order = 0;
    for (let i = 0; ; i++) {
        dataObj.datasets[indexData] = new Object();
        dataObj.datasets[indexData].label = 'oID:' + oId;
        dataObj.datasets[indexData].data = [];
        // Coordinateを取得
        for (let j = 0; j < objPolygon.geometry.coordinates[i].length; j++) {
            let valueX = objPolygon.geometry.coordinates[i][j][0];
            let valueY = objPolygon.geometry.coordinates[i][j][1];
            x.push(valueX);
            y.push(valueY);
            let data = new Object();
            data.x = valueX;
            data.y = valueY;
            dataObj.datasets[indexData].data.push(data);
            // Xの最大値保存
            if (x_max[order] < valueX) {
                x_max[order] = valueX;
            }
            // Xの最小値保存
            if (x_min[order] > valueX) {
                x_min[order] = valueX;
            }
        }
        // Geometryの各種表示用設定
        dataObj.datasets[indexData].borderColor = g_colors[getColorIndex(oId, arrOidColors)];
        dataObj.datasets[indexData].borderWidth = 2;
        dataObj.datasets[indexData].pointBackgroundColor = g_colors[getColorIndex(oId, arrOidColors)];
        dataObj.datasets[indexData].pointBorderColor = g_colors[getColorIndex(oId, arrOidColors)];
        dataObj.datasets[indexData].pointRadius = 1;
        dataObj.datasets[indexData].pointHoverRadius = 1;
        dataObj.datasets[indexData].fill = true;
        dataObj.datasets[indexData].tension = 0;
        dataObj.datasets[indexData].showLine = true;
        dataObj.datasets[indexData].order = 1;      // 前面／背面
        dataObj.datasets[indexData].backgroundColor = g_colorWhite;
        // 続きがある
        if ((i + 1) < objPolygon.geometry.coordinates.length) {
            order++;
            indexData++;
        }
        // 続きが無い
        else {
            break;
        }
    }
    // Geometry画像表示順序（前面／背面）設定
    setGeometryOrder(order, dataObj.datasets, indexData, x_min, x_max, g_colorsBackGround[getColorIndex(oId, arrOidColors)]);                     
    return indexData;
}

/**
 * Point の dataObj.datasets を設定する
 * @param {Object} dataObj dataObj
 * @param {array} objPoint PointのGeoJSONデータ
 * @param {array} arrOidTimestamp OIDを格納しているg_colorsに対応する配列（そのOIDがどの色か）
 * @param {array} arrOidColors  OIDを格納しているg_colorsに対応する配列（そのOIDがどの色か）
 * @param {number} indexData datasetsのインデックス
 * @param {array} x xの配列
 * @param {array} y yの配列
 * @returns {number} indexData
 */
 function setPointDatasets(dataObj, objPoint, arrOidTimestamp, arrOidColors, indexData, x, y) {
    // OIDとタイムスタンプを一旦保存
    setOidTimstampToObj(
        arrOidTimestamp, objPoint.properties.oID, objPoint.properties.timestamp);
    dataObj.datasets[indexData] = new Object();
    let oId = objPoint.properties.oID;
    dataObj.datasets[indexData].label = 'oID:' + oId;
    dataObj.datasets[indexData].data = [];
    // Coordinateを取得（Pointの場合は1個のみ）
    x.push(objPoint.geometry.coordinates[0]);
    y.push(objPoint.geometry.coordinates[1]);
    let data = new Object();
    data.x = objPoint.geometry.coordinates[0];
    data.y = objPoint.geometry.coordinates[1];
    dataObj.datasets[indexData].data.push(data);
    // Geometryの各種表示用設定
    dataObj.datasets[indexData].borderColor = g_colors[getColorIndex(oId, arrOidColors)];
    dataObj.datasets[indexData].borderWidth = 2;
    dataObj.datasets[indexData].pointBackgroundColor = g_colors[getColorIndex(oId, arrOidColors)];
    dataObj.datasets[indexData].pointBorderColor = g_colors[getColorIndex(oId, arrOidColors)];
    dataObj.datasets[indexData].pointRadius = 3;
    dataObj.datasets[indexData].pointHoverRadius = 3;
    dataObj.datasets[indexData].fill = false;
    dataObj.datasets[indexData].tension = 0;
    dataObj.datasets[indexData].showLine = false;   
    return indexData;
}
/**
 * グラフ描画
 * @param {number} low - 小さい方のスライダーつまみ位置（grid位置）
 * @param {number} high - 大きい方のスライダーつまみ位置（grid位置）
 * @param {number} sliderLow - 小さい方のスライダーつまみ位置（実際の設定値）
 * @param {number} sliderHigh - 大きい方のスライダーつまみ位置（実際の設定値）
 * @param {boolean} isCreateSlider - スライダーを描画するかどうか
 */
 function createGraph(low, high, sliderLow, sliderHigh, isCreateSlider) {
    // GeoJSONとして解析済みのグラフデータ
    const arrObjGeometries = g_jsonGeometories;
    
    // coordinate
    let x = [];
    let y = [];
    // coordinate range
    let x_range_min = 0;
    let x_range_max = 0;
    let y_range_min = 0;
    let y_range_max = 0;
    // Chart data
    let dataObj = new Object();
    dataObj.datasets = [];
    // OIDをキーとしてタイムスタンプの配列を格納する連想配列
    let arrOidTimestamp = new Object();
    // OIDを格納しているg_colorsに対応する配列（そのOIDがどの色か）
    let arrOidColors = new Object();
    let indexData = 0;
    // Chart のdataにグラフの値をセット
    for (let i = 0; i < arrObjGeometries.length; i++) {
        if (low <= i && i <= high) {
            for (let j = 0; j < arrObjGeometries[i].length; j++, indexData++) {
                // 図形種別を判別し、Data作成
                // LineString
                if (arrObjGeometries[i][j].geometry.type == 'LineString') {
                    indexData = setLineStringDatasets(dataObj, arrObjGeometries[i][j], arrOidTimestamp, arrOidColors, indexData, x, y);
                }
                // Polygon
                else if (arrObjGeometries[i][j].geometry.type == 'Polygon') {
                    indexData = setPolygonDatasets(dataObj, arrObjGeometries[i][j], arrOidTimestamp, arrOidColors, indexData, x, y);
                }
                else if (arrObjGeometries[i][j].geometry.type == 'Point') {
                    indexData = setPointDatasets(dataObj, arrObjGeometries[i][j], arrOidTimestamp, arrOidColors, indexData, x, y);
                }
            }
        }
    }
    // 各データに正式なラベルを設定
    setDatasetLabels(dataObj.datasets, arrOidTimestamp);

    // coordinate range
    x_range_min = Math.min(...x) - 0.2;
    x_range_max = Math.max(...x) + 0.2;
    y_range_min = Math.min(...y) - 0.2;
    y_range_max = Math.max(...y) + 0.1;

    // Chart option
    let options = {
        // アニメーション
        animation: false,
        // 凡例
        legend: {
            align: 'start',     // 左
            position: 'top',    // 上
            labels:{
                filter: function(items, chartData) {
                  // labelが'None'の凡例を非表示
                  return items.text != 'None';
                }
            }
        },
        // X軸、Y軸
        scales: {
            xAxes: [{
                id: 'x-axis-1',
                ticks: {
                    display: false,
                    min: x_range_min,
                    max: x_range_max
                },
                gridLines: {
                    color: "rgba(0, 0, 0, 0)",
                }
            }],
            yAxes: [{
                id: 'y-axis-1',
                ticks: {
                    display: false,
                    min: y_range_min,
                    max: y_range_max
                },
                gridLines: {
                    color: "rgba(0, 0, 0, 0)",
                }
            }]
        },
        // レイアウト（余白）
        layout: {
            padding: {
                left: 10,
                right: 60,
                top: 0,
                bottom: 20
            }
        },
        responsive: true,
        // グラフ画面の縦横比を維持しない（デフォルトは 横:縦 = 2:1）、つまりcanvasタグを囲むdiv styleを有効にする。
        maintainAspectRatio: false,
        // 四角線でグラフを囲む
        annotation: {
            annotations: [{
                type: 'box',
                scaleID: 'y-axis-1',
                xMin: x_range_min,
                xMax: x_range_max,
                yMin: y_range_min,
                yMax: y_range_max,
                borderColor: 'black',
                backgroundColor: 'rgba(0, 0, 0, 0)',
                borderWidth: 2,
            }]
        }
    }
    // 凡例の数によって表示位置が変更することへの対応のための係数
    let adjustment = Math.ceil((Object.keys(arrOidTimestamp).length / 5)) * 21.7;
    // グラフ位置
    let ctxDivChart = document.getElementById('divmychart');
    ctxDivChart.style.height = 535 + adjustment + 'px';
    // グラフを描画する領域
    let ctx = document.getElementById('mychart').getContext('2d');
    // グラフ描画
    g_chart = new Chart(ctx, {
        type: 'scatter',
        data: dataObj,
        options: options
    });
    // coodinate value text
    ctx.font = "15px Consolas";
    ctx.fillStyle = "black";
    ctx.fillText(Math.floor(x_range_min) + ',' + Math.floor(y_range_min), 0, 520 + adjustment);  // 左下
    ctx.fillText(Math.floor(x_range_max) + ',' + Math.floor(y_range_max), 515, 20 + adjustment); // 右上
    // 期間の位置（Window *** - ***）
    let ctxDivPeriod = document.getElementById('divperiod');
    let oId = arrObjGeometries[0][0].properties.oID;
    let period = arrOidTimestamp[oId][0] + ' - ' + arrOidTimestamp[oId][arrOidTimestamp[oId].length - 1];
    let periodTop = 530 + adjustment;
    ctxDivPeriod.innerHTML = 
        "<div style='position:absolute; fontSize:14px; top:" + periodTop + "px; left:55px'>" + 
        "<b>Window</b>&nbsp;&nbsp;" + period + 
        "</div>";
    // 保存値と変化があったら
    if (g_sliderLow !== low || g_sliderHigh !== high) {
        // kafkaからデータを受信したタイミング
        if (isCreateSlider === true) {
            // スライダー設定
            let ctxDivRange = document.getElementById('divrange');
            let rangeTop = 540 + adjustment;
            let lowValue = getSliderVal(low);
            let highValue = getSliderVal(high);
            ctxDivRange.innerHTML = 
                "<div class='slidebar-multithumb' style='position:absolute; top:" + rangeTop + "px; left:15px'>" + 
                "<input class='thumb-1' type='range' name='range-1' id='range-1' min='0' max='" + g_sliderMax +  "' value='" + lowValue + "' style='width:480px;'"　+
                    "oninput='rangeOnChange()' onchange='rangeOnChange()'/>" +
                "<input class='thumb-2' type='range' name='range-2' id='range-2' min='0' max='" + g_sliderMax +  "' value='" + highValue + "' style='width:480px;'" + 
                    "oninput='rangeOnChange()' onchange='rangeOnChange()'/>" +
                "</div>";
        }
        // スライダーを操作したタイミングでは描画しない
        else {
            // 何もしない
        }
        // スライダー位置保存
        g_sliderLow = low;
        g_sliderHigh = high;        
    }
};

/**
 * データのインデックスからスライダーへのインデックスを取得
 * @param {number} indexValue データのインデックス
 * @returns スライダーへの設定値
 */
function getSliderVal(indexValue) {
    // スライダーのつまみ位置
    if (indexValue == 0) {
        return '0';
    }
    else {
        return String((g_sliderMax / (g_jsonIndex)) * indexValue);
    }
}

/**
 * スライダー操作時のイベント
 */
const rangeOnChange = () => {
    // HTMLスライダー要素
    const rangeLow = document.getElementById('range-1');
    const rangeHigh = document.getElementById('range-2');
    low = Math.floor((g_jsonIndex / g_sliderMax) * rangeLow.value);
    high = Math.floor((g_jsonIndex / g_sliderMax) * rangeHigh.value);
    // 保存値と変化があったら
    if (g_sliderLow !== rangeLow.value || g_sliderHigh !== rangeHigh.value) {
        // スライダーの範囲を描画
        createGraph(low, high, rangeLow.value, rangeHigh.value, false);
    }
    // // Debug
    // let currentLowValueElem = document.getElementById('low-value');
    // let currentHighValueElem = document.getElementById('high-value');
    // currentLowValueElem.innerText = low;
    // currentHighValueElem.innerText = high;
}