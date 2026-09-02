var academicCulturalFunc = null;

$(function(){
	
	$.funcAcademicCultural = function (){
		var _this = this;
		
		this.opt = {
				"pageIndex":1
				,"curPage":0
				,"totalPageCount":0
				,"searchCnd":""
				,"searchWrd":""
				,"url":"/resources/academiccultural"
				,"nttId":""
		}
		
		this.listInit = function(curPage) {
			_this.opt.curPage = curPage;
			_this.listBindEvent();
			
			_this.opt.searchCnd = $('#search_cnd').val();
			_this.opt.searchWrd = $('#search_keyword').val();
			
			_this.opt.pageIndex = 1;
			_this.getList();
		}
		
		this.infoInit = function(nttId) {
			_this.infoBindEvent();
			_this.opt.nttId = nttId;
			_this.opt.searchCnd = $('#searchCnd').val();
			_this.opt.searchWrd = $('#searchWrd').val();
			_this.getInfo();
		}
		
		this.listBindEvent = function() {
		
			$('.tab-wrap >ul >li').on('click', function() {
				var idx = $(this).index();
				$('.tab-wrap >ul >li').removeClass('active');
				$('.tab-wrap >ul >li').eq(idx).addClass('active');
				
				_this.opt.searchCnd = $('#search_cnd').val();
				_this.opt.searchWrd = $('#search_keyword').val();
				_this.opt.pageIndex = 1;
				
				_this.getList();
			
			});
			$('#btn_search').on('click', function() {
				_this.goSearch();
			});
			
			$('#btn_more').on('click', function() {
				_this.opt.pageIndex += 1;
    			_this.getList();
			});
			
			$("#search_keyword").keydown(function(key) {
				if (key.keyCode == 13) {
			        _this.goSearch();
			    }
			});
		}
		
		this.infoBindEvent = function() {
			$('#btn_list').on('click', function() {
				var param = '';
				if(_this.opt.searchCnd !== null && _this.opt.searchWrd !=null){
					param = '?searchCnd=' + _this.opt.searchCnd + '&searchWrd=' + _this.opt.searchWrd;	
				}
				location.href = _this.opt.url + '/list/' + _this.opt.pageIndex + param;
			});
		}
		
		this.getList = function() {
			
			$.ajax({
			    url: _this.opt.url + '/listData/'+ _this.opt.pageIndex, // 요청 할 주소
			    async:true,							// false 일 경우 동기 요청으로 변경
			    type:'POST', 						// GET, PUT, DELETE
			    data: {
			    	"searchCnd":_this.opt.searchCnd,
					"searchWrd":_this.opt.searchWrd,
			    },	// 전송할 데이터
			    dataType:'json',					// xml, json, script, html
			    beforeSend:function(jqXHR) {		// 서버 요청 전 호출 되는 함수 return false; 일 경우 요청 중단
			    	
			    },	
			    success:function(jqXHR) {			// 요청 완료 시
			    	var resultCode = jqXHR.resultCode;
			    	var resultMsg = jqXHR.resultMsg;
			    	var addRow = '';
			    	
			    	if (resultCode == "1") {
			    		
			    		if (jqXHR.paginationInfo.currentPageNo == 1) {
			    			$('.thumb-list').empty();
			    		}
			    		
			    		if (jqXHR.paginationInfo.totalRecordCount == 0) {
			    			$('#btn_more').hide();
			    		} else {
			    					    		
				    	$.each(jqXHR.resultList, function(key,data) {
	
				    			addRow += '<li  class="">';
				    			addRow += '		<a href="' +  _this.opt.url + '/info/' + data.nttId + '" title="' + data.nttSj + ' 바로가기" >';
								addRow += '		<span class="img-wrap has-overlay">';
								
								var thumbCnt = 0;
								if(data.atchFileId != null && data.atchFileId != ''){
									// 첨부파일
									var fileList = data.files;
									if(fileList!=null){
										for(var i=0; i<fileList.length; i++){
											// fileGubun F:첨부파일, P:썸네일
											if(fileList[i].fileGubun=='P' && thumbCnt == 0 ){
												thumbCnt = 1;
												addRow += '			<img src="/board/getImage/'+fileList[i].atchFileId+'/'+fileList[i].fileSn+'" alt="' + data.nttSj + ' 썸네일 이미지">';
											}
										}
									}
								}
								if(thumbCnt == 0 ){//default
									addRow += '			<img src="/images/nrimch/kr/temp/temp_img04.jpg" alt="' + data.nttSj + ' 썸네일 이미지">';
								}
								addRow += '		</span>';
								addRow += '		<span class="txt-wrap">';
								addRow += '			<strong class="font18 title">'+data.nttSj+'</strong>';
								addRow += '			<span class="detail"><span><strong>발간년도</strong><span>'+ data.publYear +'</span></span></span>';
								
								addRow += '			<span class="desc font14">';
								if(data.nttCn != null && data.nttCn != ''){
									addRow += jsLibFunc.removeTag(data.nttCn);
								} else {
									addRow += '';
								}
								addRow += '			</span>';
								
								addRow += '			<span>';
								if(data.atchFileId != null && data.atchFileId != ''){
									// 첨부파일
									var fileList = data.files;
									if(fileList!=null){
										for(var i=0; i<fileList.length; i++){
											// fileGubun F:첨부파일, P:썸네일
											if(fileList[i].fileGubun=='F'){
												addRow += '			<button type="button" class="btn xs icon" title="'+fileList[i].orignlFileNm+' 다운받기" onClick="location.href=\'/board/fileDown/'+fileList[i].atchFileId+'/'+fileList[i].fileSn+'\'"><span>';
												if(fileList[i].fileExtsn=='hwp'){
													addRow += '<img src="/images/nrimch/kr/common/icon_download_hwp.svg" alt="'+fileList[i].orignlFileNm+'">';
												}else if(fileList[i].fileExtsn=='doc'){
													addRow += '<img src="/images/nrimch/kr/common/icon_download_doc.svg" alt="'+fileList[i].orignlFileNm+'">';
												}else if(fileList[i].fileExtsn=='pdf'){
													addRow += '<img src="/images/nrimch/kr/common/icon_download_pdf.svg" alt="'+fileList[i].orignlFileNm+'">';
												}else{
													addRow += '<img src="/images/nrimch/kr/common/icon_download_zip.svg" alt="'+fileList[i].orignlFileNm+'">';
												}
												addRow += '</span></button>';
											}
										}
									}
								}
								addRow += '			</span>';
								addRow += '		</span>';
								addRow += '		</a>';
								addRow += '</li>';
	
				    		});
							
							$('.thumb-list').append(addRow);
				    		
				    		if (jqXHR.paginationInfo.currentPageNo < jqXHR.paginationInfo.totalPageCount) {
				    			$('#btn_more').show();
				    		} else {
				    			$('#btn_more').hide();
				    		}
				    		
				    		if (_this.opt.pageIndex < _this.opt.curPage) {
				    			_this.opt.pageIndex += 1;
				    			_this.getList();
				    		}
			    		}
			    	} else {
			    		alert(resultMsg);
			    	}
			    },		
			    error:function(jqXHR) {				// 요청 실패.
			    	
			    },		
			    complete:function(jqXHR) {			// 요청의 실패, 성공과 상관 없이 완료 될 경우 호출
			    	
			    }		
			});
		}
		
		this.goSearch = function() {
			console.log('goSearch');
			var search_cnd = $('#search_cnd').val();
			var search_keyword = $('#search_keyword').val();
			
			if (search_cnd == "" && search_keyword != "") {
				alert('검색 조건을 선택하세요.');
				$('#search_cnd').focus();
				return;
			}
			
			if (search_cnd != "" && search_keyword == "") {
				alert('검색어를 입력하세요.');
				$('#search_keyword').focus();
				return;
			}
			console.log('search_cnd:'+search_cnd);
			console.log('search_keyword:'+search_keyword);
			_this.opt.searchCnd = search_cnd;
			_this.opt.searchWrd = search_keyword;
			
			_this.opt.pageIndex = 1;
			
			_this.getList();
		}
		
		this.getInfo = function() {
			
			$.ajax({
			    url: _this.opt.url +'/infoData/'+ _this.opt.nttId, // 요청 할 주소
			    async:true,							// false 일 경우 동기 요청으로 변경
			    type:'GET', 						// GET, PUT, DELETE
			    data: {
			    	"nttId":_this.opt.nttId
			    },	// 전송할 데이터
			    dataType:'json',					// xml, json, script, html
			    beforeSend:function(jqXHR) {		// 서버 요청 전 호출 되는 함수 return false; 일 경우 요청 중단
			    	
			    },	
			    success:function(jqXHR) {			// 요청 완료 시
			    	var resultCode = jqXHR.resultCode;
			    	var resultMsg = jqXHR.resultMsg;
			    	var addRow = '';
			    	if (resultCode == "1") {
			    		
						// 게시글정보
						var info = jqXHR.result;
						$('#contentsWrap .title-wrap .title').append(info.nttSj);
						$('#contentsWrap .title-wrap .detail .line >span').append(info.frstRegisterPnttm.replace('-','.').replace('-','.'));
						$('#contentsWrap .title-wrap .detail >span').eq(1).append(addComma(info.inqireCo));
						
						// 첨부파일
						var thumbCnt = 0;
						var addRow2 = '';
						var fileList = jqXHR.files;

						var markRow = '';
                        var pNCode = jqXHR.result.publicNuriCode;

						if(fileList!=null){
							for(var i=0; i<fileList.length; i++){
								addRow += '<li>';
								
								var orignlFileNm = fileList[i].orignlFileNm;
								var orignlFileNmLength = (orignlFileNm).length;
								
								// fileGubun F:첨부파일, P:썸네일
								if(fileList[i].fileGubun=='F'){
									addRow += '			<button type="button" class="btn sm white" title="'+fileList[i].orignlFileNm+' 다운로드" onClick="location.href=\'/board/fileDown/'+fileList[i].atchFileId+'/'+fileList[i].fileSn+'\'"><span class="icon ">';
									if(fileList[i].fileExtsn=='hwp'){
										addRow += '<img src="/images/nrimch/kr/common/icon_download_hwp.svg" alt="hwp 파일">';
									}else if(fileList[i].fileExtsn=='doc'){
										addRow += '<img src="/images/nrimch/kr/common/icon_download_doc.svg" alt="doc 파일">';
									}else if(fileList[i].fileExtsn=='pdf'){
										addRow += '<img src="/images/nrimch/kr/common/icon_download_pdf.svg" alt="pdf 파일">';
									}else{
										addRow += '<img src="/images/nrimch/kr/common/icon_download_zip.svg" alt="zip 파일">';
									}
									addRow += '</span>';
									if(orignlFileNmLength > 50){
										addRow += '<span><strong>'+fileList[i].orignlFileNm.substring(0, 50) + '...'+'</strong>.'+fileList[i].fileExtsn+'</span>';	
									} else {
										let showFileNm = orignlFileNm.substring(0, orignlFileNm.lastIndexOf('.'));
										addRow += '<span><strong>'+showFileNm+'</strong>.'+fileList[i].fileExtsn+'</span>';
									} 					
									
									addRow += '</button>';
								}else if(fileList[i].fileGubun=='P' && thumbCnt == 0 ){
									thumbCnt = 1;
									addRow2 = '			<p class="img"><img src="/board/getImage/'+fileList[i].atchFileId+'/'+fileList[i].fileSn+'" alt="' + info.nttSj + ' 썸네일 이미지"></p>';
								}
								addRow += '</li>';
							}
							if(thumbCnt == 0 ){//default
								addRow2 = '			<img src="/images/nrimch/kr/temp/temp_img04.jpg" alt="' + info.nttSj + ' 썸네일 이미지">';
							}
						}
								
						$('#thumbArea').append(addRow2);
						$('#contentsWrap .title-wrap .download').append(addRow);
						
						
						$('#contentsWrap .text-wrap .desc-wrap .title').append(info.nttSj);
						$('#contentsWrap .text-wrap .desc-wrap #desc').append(info.nttCn);
						$('#publYear').append(info.publYear);	/* 발간연도 */

						if(pNCode != null && pNCode != ''){
                            markRow += '<div class="img-wrap mb16">'
                            markRow += '    <a href="https://www.kogl.or.kr/info/licenseType' + pNCode + '.do" target="_blank">'
                            markRow += '        <img src="/images/nrimch/kr/common/img_kogl_0' + pNCode + '.jpg" alt="공공누리 제 ' + pNCode + '유형 마크">'
                            markRow += '    </a>'
                            markRow += '</div>'
                            markRow += '<div class="txt-wrap font14 color-666666">국립해양유산연구소의 주요 소장품 저작물들은&nbsp;'
                            markRow += '    <span>&apos;공공누리&apos;</span>&nbsp;'
                            if(pNCode == 4){
                                markRow += ' <span style="color: red; font-weight: bold;">출처표시 - 상업적이용금지 - 변경금지 조건</span>에 따라 이용할 수 있습니다.'
                            } else if  (pNCode == 3){
                                markRow += ' <span style="font-weight: bold;">출처표시 + 변경금지</span> 조건에 따라 이용할 수 있습니다.'
                            } else if  (pNCode == 2){
                                markRow += ' <span style="font-weight: bold;">출처표시 + 상업적 이용금지</span> 조건에 따라 이용할 수 있습니다.'
                            } else {
                                markRow += ' <span style="font-weight: bold;">공공저작물의 자유이용(출처표시)</span> 조건에 따라 이용할 수 있습니다.'
                            }
                            markRow += '</div>'

                        } else {
                            markRow += '<div class="img-wrap mb16">'
                            markRow += '    <a href="https://www.kogl.or.kr/info/licenseType2.do" target="_blank">'
                            markRow += '        <img src="/images/nrimch/kr/common/img_kogl_02.jpg" alt="공공누리 제 2유형 마크">'
                            markRow += '    </a>'
                            markRow += '</div>'
                            markRow += '<div class="txt-wrap font14 color-666666">국립해양유산연구소의 주요 소장품 저작물들은 '
                            markRow += '    <span>&apos;공공누리&apos;</span>&nbsp;'
                            markRow += '    <span style="font-weight: bold;">출처표시 + 상업적 이용금지</span> 조건에 따라 이용할 수 있습니다.'
                            markRow += '</div>'
                        }

                        $('#publicNuriCode').append(markRow);

						//이전다음글
						var nextPrevInfo = jqXHR.nextPrev;
						var prevArea = $('.skip-wrap >li').eq(0).find('a');
						var nextArea = $('.skip-wrap >li').eq(1).find('a');
						var param = '';
						if(_this.opt.searchCnd != null && _this.opt.searchCnd != ''){
							param = '?searchCnd=' + _this.opt.searchCnd + '&searchWrd=' + _this.opt.searchWrd;
						}
						if(nextPrevInfo.prevNttId != null && nextPrevInfo.prevNttId != ''){
							prevArea.find('span').append(nextPrevInfo.prevNttSj);
							prevArea.attr('href', _this.opt.url+'/info/'+nextPrevInfo.prevNttId+param);
						}else{
							prevArea.find('span').append('이전글이 없습니다.');
							prevArea.attr('href','javascript:void(0)');
							
						}
						if(nextPrevInfo.nextNttId != null && nextPrevInfo.nextNttId != ''){
							nextArea.find('span').append(nextPrevInfo.nextNttSj);
							nextArea.attr('href', _this.opt.url+'/info/'+nextPrevInfo.nextNttId+param);
						}else{
							nextArea.find('span').append('다음글이 없습니다.');
							nextArea.attr('href','javascript:void(0)');
							
						}
			    	} else {
			    		alert(resultMsg);
			    	}
			    },		
			    error:function(jqXHR) {				// 요청 실패.
			    	
			    },		
			    complete:function(jqXHR) {			// 요청의 실패, 성공과 상관 없이 완료 될 경우 호출
			    	
			    }		
			});
		}
	}
});