openerp.web_last_viewed_records = function(instance){
    var QWeb = instance.web.qweb;
    var _t = instance.web._t;

    instance.web.ActionManager.include({
        last_viewed_history_var: 'odoo_last_viewed',
        last_viewed_history_size: 20,
        init:function(){
            this._super.apply(this, arguments);

            this.last_viewed = [];
            var last_viewed = this.load_last_viewed_history().last_viewed || [];
            for (var i=last_viewed.length-1; i>=0; i--){
                this.unshift_last_viewed(last_viewed[i]);
            }
        },
        add_last_viewed: function(item){
            if (_.any(this.last_viewed, function(x){
                    if (x['title'] != item['title'] ||
                        x['view_type'] != item['view_type'] ||
                        x['url']['model'] != item['url']['model'])
                        return false;
                    if (x['view_type'] == 'form' && x['id'] != item['id'])
                        return false;
                    return true;
                }))
                return;

            //save json data to localStorage
            var data = this.load_last_viewed_history();
            data.last_viewed = data.last_viewed || []
            data.last_viewed.unshift(item);
            data.last_viewed.splice(this.last_viewed_history_size);
            this.save_last_viewed_history(data);

            this.unshift_last_viewed(item);
        },
        unshift_last_viewed: function(item){
            var self = this;
            this.last_viewed.unshift(item);
            this.last_viewed.splice(this.last_viewed_history_size);
        },
        load_last_viewed_history: function(){
            var data = localStorage[this.last_viewed_history_var] || '{}';
            return JSON.parse(data);
        },
        save_last_viewed_history: function(data){
            localStorage[this.last_viewed_history_var] = JSON.stringify(data);
        },
        get_last_viewed_title: function(){
            var titles = [];
            for (var i = 0; i < this.last_viewed.length; i += 1) {
                var item = this.last_viewed[i];
                var label = item.title;
                var selected = false;//item.action.id == this.inner_action.id && item.action.res_id == this.inner_action.res_id;
                var view_type = item.view_type;
                var url = $.param(item.url);
                var title = item.url.model;
                titles.push(_.str.sprintf('<a title="%s" href="#%s" class="oe_last_viewed_item %s"><span class="oe_e %s"/>&nbsp;</span>%s</a>',
                                          title,
                                          url,
                                          selected && 'selected' || '',
                                          view_type,
                                          label));
            }
            return titles.join(' <span class="oe_fade">|</span>&nbsp;');
        },
    })

    instance.web.ViewManagerAction.include({
        try_add_last_viewed: function(view_type){
            var view = this.views[view_type];
            var act = view.options.action;
            if (!act.type)
                return false;

            if (act.target == 'new')
                //skip widgets and popup forms
                return false;

            var url = {
                    'view_type': view_type,
                    'model': act.res_model,
                    'menu_id': act.menu_id,
                    'action': act.id
                }
            var title = act.display_name;
            var dr = view.controller.datarecord;
            if (dr){
                title = dr.display_name || title;
                if (view_type=='form'){
                    url['id'] = dr.id;
                }
            }
            if (view_type=='form' && !url['id'])
                return false;
            var last_viewed_item = {
                'title': title,
                'url': url,
                'view_type': view_type,
            }
            this.ActionManager.add_last_viewed(last_viewed_item);

            return true;
        },
        do_create_view: function(view_type) {
            var self = this;

            var res = this._super.apply(this, arguments);

            var view = this.views[view_type];
            view.controller.on('change:title', this, function(){
                if (self.active_view == view_type && self.try_add_last_viewed(view_type))
                    self.update_last_viewed_title()
            })

            return res;

        },
        update_last_viewed_title: function(){
            this.$el.find('.oe_view_manager_last_viewed').html(this.get_action_manager().get_last_viewed_title());
        },
        set_title: function(){
            this._super.apply(this, arguments);
            if (this.action.target!='new')
                this.update_last_viewed_title();
        }

    })
    instance.mail.Wall.include({
        start: function() {
            this._super();
            this.update_last_viewed_title();
        },
        update_last_viewed_title: function(){
            this.$el.find('.oe_view_manager_last_viewed').html(this.ActionManager.get_last_viewed_title());
        },
    });
}
