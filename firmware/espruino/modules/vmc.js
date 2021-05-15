
VMC.prototype.CONFIG_DATA {
  'level'        : 0x01,
  'display_cols' : 0x00,
  'display_rows' : 0x00,
  'display_info' : 0x00
};

VMC.prototype.MAX_MIN_PRICE {
  'max_price': 0x0000;
  'min_price': 0x0000;
};

VMC.prototype.setConfigData = functino(data) {
    //setup_config_data.code_cmd = buffer[0];
    //setup_config_data.config_data = buffer[1];
    CONFIG_DATA.level = buffer[2];
    CONFIG_DATA.display_cols = buffer[3];
    CONFIG_DATA.display_rows = buffer.slice(4,5);
    CONFIG_DATA.display_info = buffer.slice(5,bufLen-1);
};

VMC.prototype.setMaxMinPrice = function(data) {
    //setup_mm_prices.code_cmd = buffer[0];
    //setup_mm_prices.mm_prices = buffer[1];
    this.MAX_MIN_PRICE.max_price = buffer.slice(2,3);
    this.MAX_MIN_PRICE.min_price = buffer.slice(4,5);
};