/* Based on 
 * - EGM Mathematical Finance class by Enrique Garcia M. <egarcia@egm.co>
 * - A Guide to the PMT, FV, IPMT and PPMT Functions by Kevin (aka MWVisa1)
 */
function PUT_COMMA(NUM){
 	NUM=Math.floor(NUM);
 	NUM=String(NUM).replace( /(\d)(?=(\d\d\d)+(?!\d))/g, '$1,');
 	return ( Array(20).join('\u00a0') + NUM).slice(NUM.length*-1);
}

function PMT(rate, nper, pv) {
		if (rate == 0) return -(pv)/nper;
		var pvif = Math.pow(1 + rate, nper);
		var pmt = rate / (pvif - 1) * (pv * pvif);
		return pmt;
	}
function LOAN_TABLE(rate,year,pv){
	loan_payment=[0];
	loan_pv=[pv];
	loan_principal=[0];
	loan_interest=[0];
	loan_months=year
	loan_rate=[rate];
	loan_payment=PMT(rate,loan_months,pv);//１ヶ月の返済総額
	loan_payment_year=[0];
	loan_pv_year=[""];
	loan_principal_year=[0];
	loan_interest_year=[0];
	ads=[0];
	var principal_year=0;
	var interest_year=0;

	//月額返済金額の計算
	for (var i = 0;i<loan_months; i++) {
		loan_rate[i+1]=loan_rate[i];
		loan_interest[i]=loan_pv[i]*loan_rate[i];
		loan_principal[i]=loan_payment-loan_interest[i];
		loan_pv[i+1]=loan_pv[i]-loan_principal[i];
	}
	//年間返済金額の計算
	for (var i = 0;i<loan_months/12; i++) {
		loan_pv_year[i]=loan_pv[i*12];
		for(var j=0;j<12;j++){
			principal_year=principal_year+loan_principal[i*12+j];
			interest_year=interest_year+loan_interest[i*12+j];
		}
		loan_principal_year[i]=parseFloat(principal_year);
		loan_interest_year[i]=parseFloat(interest_year);
		ads[i]=parseFloat(principal_year+interest_year);
		loan_pv_year[i]=parseFloat(loan_pv_year[i]-principal_year);
		if(loan_pv_year[i]<=0){loan_pv_year[i]=0};
		console.log("loan_pv_year"+loan_pv_year[i])
		principal_year=0;
		interest_year=0;

	}
	//ローン期間終了後100年までゼロで埋める
	for (var i = ads.length;i<100; i++) {
		loan_principal_year.push(0);
		loan_interest_year.push(0);
		ads.push(0);
		loan_pv_year.push(0);
		}
}
function DEPRECIATION(depre_price,depre_unamo,depre_period,years){
	if(depre_period<=years){
		depre_period=parseFloat(depre_period*0.2);
		console.log("超過depre_period="+depre_period);
	}
	else
	{depre_period=parseFloat(depre_period-years+years*0.2);
	 console.log("内depre＿period＝"+depre_period);
	}
	depre_remain[0]=depre_unamo;
	depre_total[0]=0;
	for (var i = 0; i < 100; i++) {
		if(depre_remain[i]-(depre_unamo/depre_period)>=0){
		 depre_current.push(parseFloat(depre_price/depre_period));
		 depre_remain.push(depre_remain[i]-depre_current[i])
		 depre_total.push(depre_total[i]+depre_current[i])
		 console.log("depre_remain="+depre_remain[i]+"depre_total="+depre_total[i])
		}
		else{depre_current[i]=depre_remain[i];
			depre_remain[i]=0;
			parseFloat(depre_total[i]=depre_total[i]+depre_current[i]);
			console.log("減価償却完了")
			for (var j = i;j<100; j++) {
			depre_current.push(0);
			depre_remain.push(0);
			depre_total.push(depre_unamo);
		}
		i=100;
			}
	}
	
}
function XNPV(rate,period,values) {
		var xnpv = 0.0;
		for (var i=0;i<=period+1;i++) {
			xnpv += values[i] / Math.pow(1 + rate, i);
			//console.log("i="+i+"xnpv="+xnpv+"values="+values[i]+"rate="+rate);
		};
		return xnpv;
	}

function XIRR(values, period,guess) {
		if (!guess) guess = 0.1;
		
		var x1 = 0.0;
		var x2 = guess;
		var f1 = this.XNPV(x1, period,values);
		var f2 = this.XNPV(x2, period,values);
		
		for (var i = 0; i < 100; i++) {
			if ((f1 * f2) < 0.0) break;
			if (Math.abs(f1) < Math.abs(f2)) {
				f1 = this.XNPV(x1 += 1.6 * (x1 - x2), period,values);
			}
			else {
				f2 = this.XNPV(x2 += 1.6 * (x2 - x1), period,values);
			}
		};
		
		if ((f1 * f2) > 0.0) return null;
		
		var f = this.XNPV(x1, period,values);
		if (f < 0.0) {
			var rtb = x1;
			var dx = x2 - x1;
		}
		else {
			var rtb = x2;
			var dx = x1 - x2;
		};
		
		for (var i = 0; i < 100; i++) {
			dx *= 0.5;
			var x_mid = rtb + dx;
			var f_mid = this.XNPV(x_mid, period,values);
			if (f_mid <= 0.0) rtb = x_mid;
			if ((Math.abs(f_mid) < 1.0e-6) || (Math.abs(dx) < 1.0e-6)) return x_mid;
		};
		
		return null;
	};

function Souzokuzeikeisan(pshisan){
　
  var kisoko;
  var kazeiisan;
  var hkazeiisan;
  var kkazeiisan;
  var hzeiri;
  var hmes;
  var hkoujyo;
  var kzeiri;
  var kmes;
  var kkoujyo;
  var hzeigaku;
  var kzeigaku;
  var zeigaku;
  var nouzei;

  var shisankazu=pshisan;
  var haigukazu;
  var kodomokazu;
  haigukazu=$('#haigu').val();
  kodomokazu=$('#kodomo').val();
  console.log("shisankazu="+shisankazu+"haigukazu="+haigukazu+"kodomokazu="+kodomokazu)
  if(haigukazu==0)kisoko=kodomokazu*600+3000; else kisoko=kodomokazu*600+3600;
  kazeiisan=shisankazu-kisoko;
  if(kazeiisan<0){kazeiisan=0}
  if(haigukazu=="0")
  {
    if(kodomokazu>0)
    {
    hkazeiisan=0;
    kkazeiisan=parseFloat(kazeiisan/kodomokazu);
    }
    else
    {
    alert("配偶者と子がいない場合には対応しておりません。");
    hkazeiisan=0;
    kkazeiisan=0;
    return;
    }
  }
  if(haigukazu=="1")
  {
    if(kodomokazu>0)
    {
    hkazeiisan=parseFloat(kazeiisan/2);
    kkazeiisan=parseFloat(kazeiisan/2/kodomokazu);
    }
    else
    {
    hkazeiisan=parseFloat(kazeiisan);
    kkazeiisan=0;
    }
  }
    //配偶者の税率・控除額
    if(hkazeiisan<=1000){
    hzeiri=0.1;
    hmes="　1,000万円以下";
    hkoujyo=0;}
    else if(hkazeiisan<=3000){
    hzeiri=0.15;
    hmes="　1,000万円超、3,000万円以下";
    hkoujyo=50;}
    else if(hkazeiisan<=5000){
    hzeiri=0.2;
    hmes="　3,000万円超、5,000万円以下";
    hkoujyo=200;}
    else if(hkazeiisan<=10000){
    hzeiri=0.3;
    hmes="　5,000万円超、1億円以下";
    hkoujyo=700;}
    else if(hkazeiisan<=20000){
    hzeiri=0.4;
    hmes="　1億円超、2億円以下";
    hkoujyo=1700;}
    else if(hkazeiisan<=30000){
    hzeiri=0.45;
    hmes="　2億円超、3億円以下";
    hkoujyo=2700;}
    else if (hkazeiisan<=60000){
    hzeiri=0.5;
    hmes="　3億円超、6億円以下";
    hkoujyo=4200;}
    else {
    hzeiri=0.55;
    hmes="　6億円超";
    hkoujyo=7200;}
    //子供の税率・控除額
    if(kkazeiisan<=1000){
    kzeiri=0.1;
    kmes="　1,000万円以下";
    kkoujyo=0;}
    else if(kkazeiisan<=3000){
    kzeiri=0.15;
    kmes="　1,000万円超、3,000万円以下";
    kkoujyo=50;}
    else if(kkazeiisan<=5000){
    kzeiri=0.2;
    kmes="　3,000万円超、5,000万円以下";
    kkoujyo=200;}
    else if(kkazeiisan<=10000){
    kzeiri=0.3;
    kmes="　5,000万円超、1億円以下";
    kkoujyo=700;}
    else if(kkazeiisan<=20000){
    kzeiri=0.4;
    kmes="　1億円超、2億円以下";
    kkoujyo=1700;}
    else if(kkazeiisan<=30000){
    kzeiri=0.45;
    kmes="　2億円超、3億円以下";
    kkoujyo=2700;}
    else if (kkazeiisan<=60000){
    kzeiri=0.5;
    kmes="　3億円超、6億円以下";
    kkoujyo=4200;}
    else {
    kzeiri=0.55;
    kmes="　6億円超";
    kkoujyo=7200;}
    //税額計算
      hzeigaku=hkazeiisan*hzeiri-hkoujyo;
      kzeigaku=(kkazeiisan*kzeiri-kkoujyo)*kodomokazu;
      zeigaku=hzeigaku+kzeigaku;
      //配偶者控除
    nouzei=parseFloat(zeigaku/2);
    if(haigukazu=="0")nouzei=parseFloat(zeigaku);
    if(kodomokazu=="0")nouzei=0;
    return nouzei
}
