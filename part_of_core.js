(function a(appSpace) {


    //===========================================================================================================

<cute>

    //===========================================================================================================


    var BaseList = function (typeOfList, keeper, collect) { //Класс для работы с коллекцией документов
        var collection = [];
        this.keeper = keeper;
        if (!typeOfList) throw new Error("Type is not response");
        if (!keeper) throw new Error("Keeper is not response");

        this.Add = function (elements) {
            if ($.isArray(elements)) {
                for (var i = 0; i < elements.length; i++) {
                    if (!elements[i].id) {
                        throw new Error("Element index: " + i + " is not have id property");
                    }
                    if (collection[elements[i].id]) {
                        throw new Error("Element with id: " + elements[i].id + " is already exists");
                    }
                    collection[elements[i].id] = new typeOfList(elements[i], this);
                }
            } else if ($.isPlainObject(elements)) {
                if (!elements.id) {
                    throw new Error("Element is not have id property");
                }
                if (collection[elements.id]) {
                    throw new Error("Element with id: " + elements.id + " is already exists");
                }
                collection[elements.id] = new typeOfList(elements);
            } else {
                throw new Error('Error type: must be object or array');
            }
            return this.List();
        };

        this.Clear = function () {
            collection = [];
            return this.List();
        };

        this.Remove = function (id) {
            collection[id] = null;
            collection.remove(id);
            return this.List();
        };

        this.List = function (filter) {
            return collection;
        };

        this.Get = function (id) {
            return collection[id];
        };

        this.Add(collect);
        return this.List();
    };


    //===========================================================================================================


    var VisualElement = function (id, template, container) { //Базовый класс для всех визуальных элементов системы
        this.id = id;
        this.template = $(template);
        this.container = container || {};

        this.hide = function () {
            $(this.id).hide();
            return this;
        }

        this.show = function () {
            $(this.id).show();
            return this;
        }

        this.element = function(element){
            if (!element){
                return $(this.id);
            }else{
                return $(this.id).find(element);
            }
        }

        this.isVisible = function () {
            return $(this.id).is(":visible");
        }

        this.resize = function (width, height) {
            for (var el in container) {
                this.container[el].resize(width, height);
            }
        }

        this.height = function (height) {
            return $(this.id).height(height);
        }

        this.width = function (width) {
            return $(this.id).width(width);
        }

        this.empty = function () {
            $(this.id).empty();
            this.container = {};
            return this;
        }

        this.click = function (delegate) {
            if (!delegate) {
                $(this.id).click();
            } else {
                $(this.id).unbind().click(delegate);
            }
        }

        this.toggle = function (actionOne, actionTwo) {
            if (!actionOne) {
                $(this.id).toggle();
            } else {
                $(this.id).unbind().toggle(actionOne, actionTwo);
            }
        }

        this.add = function (component) {
            for (var el in component) {
                this.container[el] = component[el];
                if (!(this.container[el] instanceof VisualElement)) throw "container is not Element type";
                this.container[el].appendTo(this.id);
            }
        }

        this.appendTo = function (parent) {
            if (template != undefined){
                $(parent).append(this.template)
            }else{
                $(parent).append(this.id)
            }
            return this;
        }
    }


    //===========================================================================================================

<cute>

    //===========================================================================================================


    var Core = function () {
        var isReady = false,
        timer = [],
        modules = {},
        libraries = {},
        mainInterface = null;

        var libraryList = function (libList){ //Загрузка списка библиотек доступных системе
            $.each(libList, function (index, lib) {
                libraries[lib.libraryName] = lib;
                lib.pageConstructor = App[lib.pageConstructor];
                lib.status = 'waiting';
            });
        }

        var loadLibrary = function (libName, callback) {//Загрузка конкретной библиотеки
            var lib = libraries[libName];

            if (!lib) throw new Error("Library not found");
            if (lib.status == 'removed') throw new Error("Library is removed");
            if (lib.status == 'waiting') {
                Utils.LoadJS([{ library: lib.libraryPath, unload: true, GC: []}], callback);
            }else if (lib.status == 'loaded'){
                if ($.isFunction(callback)) {
                    callback();
                }
            }
        }

        var instanceModule = function (moduleName, caption, data, pin, libName, callback) { //Инстанцирование экземпляра (модуля) библиотеки
            if (!libName) return;
            var module = null;
            var guid = null;
            $.each(modules, function(index, item){ //Ищем, вдруг модуль с таким именем уже создан
                if (item.name == moduleName){
                    module = item;
                    guid = index;
                    return false;
                }
            });

            loadLibrary(libName, function(){
                var lib = libraries[libName];

                if (!module){ //Если модуль создан пропускаем добавление его в систему
                    guid = Utils.GUID();
                    modules[guid] = {
                        name: moduleName,
                        guid: guid,
                        libraryName: libName,
                        moduleRef: null
                    };
                    module = modules[guid];

                    var page = new lib.pageConstructor(guid, caption); //Создаем окно модуля по "шаблону"
                    module.status = 'loading';
                    Utils.LoadHTML(page, lib.view, function (viewPort) { //Загружаем HTML который будем выступать для модуля контекстом
                        Utils.LoadCSS(lib.css, guid); //подгружаем необходимые библиотеки CSS
                        Utils.LoadJS(lib.request, function () { //подгружаем необходимые библиотеки JS (зависимости)
                            $.each(lib.request, function (index, item) {
                                $('script[id="' + item.libraryPath + '"]').addClass(guid); //Создаем ссылки нашего модуля на библиотеку, чтобы можно было отслеживать когда никто из модулей не использует библиотеку, и ее можно удалить из системы
                            });
                            module.moduleRef = new lib.classRef(); //Инстанцирование экземпляра
                            $(module.moduleRef).bind("poll", sync); //Сообщаем загруженному экземпляру ссылку на метод общения с ядром
                            module.moduleRef.entry({ event: "binding", guid: guid, viewPort: viewPort, name: moduleName, data: data }); //Сообщаем ядру его GUID и главный контекст
                            if ($.isFunction(callback)) {
                                callback(module);
                            }
                        });
                    });
                }else{
                    if (module.status == 'complete'){ 
                        if ($.isFunction(callback)) {
                            callback(module);
                        }
                    }else if(module.status == 'registered'){ //Если модуль загружен, но у него отсутствует контекст
                        var page = new lib.pageConstructor(guid, caption);
                        module.status = 'loading';
                        Utils.LoadHTML(page, lib.view, function (viewPort) {
                            module.moduleRef.entry({ event: "binding", guid: guid, viewPort: viewPort, name: moduleName, data: data });
                            if ($.isFunction(callback)) {
                                callback(module);
                            }
                        });
                    }
                }
            });
        };

        var removeModule = function (guid) { //Удаление модуля и чистка библиотек если нужно
            var lib = libraries[modules[guid].libraryName];
            var selfAndRequest = [{ library: lib.libraryPath, unload: true, GC: []}];
            selfAndRequest = selfAndRequest.concat(lib.request);
            var success = Utils.UnloadJS(selfAndRequest, guid);
            if (success) {
                $.each(lib.request, function (index, item) {
                    if (item.unload) {
                        for (var i = 0; i < item.GC.length; i++) {
                            window[item.GC[i]] = null;
                        }
                    }
                });
            }
            Utils.UnloadCSS(lib.css, guid);
            delete modules[guid];
        };

        var sync = function (data) { //Точка входа для сообщений модулей
            switch (data.event) {
<cute>
            }
        };

        var ready = function (func) {
            if (isReady) {
                return func();
            } else {
                var id = (new Date()).getTime();
                timer[id] = setInterval(function () {
                    if (isReady) {
                        clearInterval(timer[id]);
                        func();
                    }
                } .bind(this), 13);
            }
        };

        var login = function(){ //окно логина
            $.getJSON('./modules/common/login.php?action=CHECK&rnd='+Math.random(), function(data){
                if (data.result == true){
                    run({userName: data.userName});
                }else{
                    $('#site-wrapper').load('./modules/common/login.html?'+Math.random(), function (response, status, xhr) {
                        if (status == "success") {
                            $.each(modules, function (index, module) {
                                removeModule(module.guid);
                            });

                            $('input#in').click(function(){
                                $.getJSON('./modules/common/login.php?action=SEND&user=' + $('input#login').val() + '&pwd=' + $('input#pwd').val() + '&rnd='+Math.random(), function(data){
                                    if (data.result == true){
                                        run({userName: data.userName});
                                    }else{
                                        $('input#pwd').val('');
                                    }
                                    $.unblockUI();
                                });
                                return false;
                            });
                        } else {
                            throw new ErrorEx(status, "Sorry but there was an error: " + xhr.status + " " + xhr.statusText);
                        }
                        $.unblockUI();
                    });
                }
            });
        };

        var run = function(data){ //загрузка приложения
            $('#site-wrapper').load('./modules/common/template.html?'+Math.random(), function (response, status, xhr) {
                if (status == "success") {              
                    //====================================================================================
                    mainInterface = new MainInterface({
                        header: new Header(),
                        center: new Center()
                    });
                    mainInterface.appendTo("body");
                    mainInterface.container['header'].add({
                        windowList: new WindowList(),
                        logout: new Logout()
                    });
                    mainInterface.container['center'].add({
                        menu: new RightMenu(),
                        windows: new Windows()
                    });
                    mainInterface.container['header'].container['logout'].onClick(function(){
                        $.getJSON('./modules/common/login.php?action=LOGOUT&rnd='+Math.random(), function(data){
                            if (data.result == true){
                                login();
                            }
                            $.unblockUI();
                        });
                    });
                    //====================================================================================
<cute>
                    //====================================================================================
                    isReady = true;

                    $.getJSON('./core/modules.txt?'+Math.random(), function(data){
                        libraryList(data);
                        $.getJSON('./modules/common/login.php?action=MENU&rnd='+Math.random(), function(data){ //
                            mainInterface.container['center'].container['menu'].setItems(data);
                            $.unblockUI();
                        });
                    });

                    mainInterface.container['header'].userInfo(data.userName);
                } else {
                    throw new ErrorEx(status, "Sorry but there was an error: " + xhr.status + " " + xhr.statusText);
                }
                $.unblockUI();
            } .bind(this));
        }

        return {
            Ready: function (func) {
                ready(func);
            },

            Registry: function (libraryRef, libraryName) { //Метод регистрации для внешних модулей
                var lib = libraries[libraryName];
                if (lib.status == 'waiting'){
                    lib.classRef = libraryRef;
                    lib.status = 'loaded';
                }
            },

            Run: function () { //Запуск приложения
                $(window.document).ajaxStart($.blockUI);//.ajaxStop($.unblockUI);
                login();
            }
        };
    } ();


    //===========================================================================================================

<cute>

    //===========================================================================================================


    appSpace = Utils.Namespace(appSpace);
    appSpace["Core"] = Core;
    appSpace["BaseList"] = BaseList;
    appSpace["VisualElement"] = VisualElement;
    appSpace["Scrollable"] = Scrollable;
    appSpace["AsDocument"] = AsDocument;
})("App");
