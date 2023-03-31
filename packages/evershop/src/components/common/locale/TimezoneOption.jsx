import PropTypes from 'prop-types';
import React from 'react';

function TimezoneOptions(props) {
  const { timezones, children } = props;

  const options = [
    {
      value: 'Australia/Darwin',
      text: 'AUS Central Standard Time (Australia/Darwin)'
    },
    {
      value: 'Australia/Melbourne',
      text: 'AUS Eastern Standard Time (Australia/Melbourne)'
    },
    {
      value: 'Australia/Sydney',
      text: 'AUS Eastern Standard Time (Australia/Sydney)'
    },
    { value: 'Asia/Kabul', text: 'Afghanistan Standard Time (Asia/Kabul)' },
    {
      value: 'America/Anchorage',
      text: 'Alaskan Standard Time (America/Anchorage)'
    },
    { value: 'America/Juneau', text: 'Alaskan Standard Time (America/Juneau)' },
    { value: 'America/Nome', text: 'Alaskan Standard Time (America/Nome)' },
    { value: 'America/Sitka', text: 'Alaskan Standard Time (America/Sitka)' },
    {
      value: 'America/Yakutat',
      text: 'Alaskan Standard Time (America/Yakutat)'
    },
    { value: 'Asia/Aden', text: 'Arab Standard Time (Asia/Aden)' },
    { value: 'Asia/Bahrain', text: 'Arab Standard Time (Asia/Bahrain)' },
    { value: 'Asia/Kuwait', text: 'Arab Standard Time (Asia/Kuwait)' },
    { value: 'Asia/Qatar', text: 'Arab Standard Time (Asia/Qatar)' },
    { value: 'Asia/Riyadh', text: 'Arab Standard Time (Asia/Riyadh)' },
    { value: 'Asia/Dubai', text: 'Arabian Standard Time (Asia/Dubai)' },
    { value: 'Asia/Muscat', text: 'Arabian Standard Time (Asia/Muscat)' },
    { value: 'Etc/GMT-4', text: 'Arabian Standard Time (Etc/GMT-4)' },
    { value: 'Asia/Baghdad', text: 'Arabic Standard Time (Asia/Baghdad)' },
    {
      value: 'America/Argentina/La_Rioja',
      text: 'Argentina Standard Time (America/Argentina/La_Rioja)'
    },
    {
      value: 'America/Argentina/Rio_Gallegos',
      text: 'Argentina Standard Time (America/Argentina/Rio_Gallegos)'
    },
    {
      value: 'America/Argentina/Salta',
      text: 'Argentina Standard Time (America/Argentina/Salta)'
    },
    {
      value: 'America/Argentina/San_Juan',
      text: 'Argentina Standard Time (America/Argentina/San_Juan)'
    },
    {
      value: 'America/Argentina/San_Luis',
      text: 'Argentina Standard Time (America/Argentina/San_Luis)'
    },
    {
      value: 'America/Argentina/Tucuman',
      text: 'Argentina Standard Time (America/Argentina/Tucuman)'
    },
    {
      value: 'America/Argentina/Ushuaia',
      text: 'Argentina Standard Time (America/Argentina/Ushuaia)'
    },
    {
      value: 'America/Buenos_Aires',
      text: 'Argentina Standard Time (America/Buenos_Aires)'
    },
    {
      value: 'America/Catamarca',
      text: 'Argentina Standard Time (America/Catamarca)'
    },
    {
      value: 'America/Cordoba',
      text: 'Argentina Standard Time (America/Cordoba)'
    },
    { value: 'America/Jujuy', text: 'Argentina Standard Time (America/Jujuy)' },
    {
      value: 'America/Mendoza',
      text: 'Argentina Standard Time (America/Mendoza)'
    },
    {
      value: 'America/Glace_Bay',
      text: 'Atlantic Standard Time (America/Glace_Bay)'
    },
    {
      value: 'America/Goose_Bay',
      text: 'Atlantic Standard Time (America/Goose_Bay)'
    },
    {
      value: 'America/Halifax',
      text: 'Atlantic Standard Time (America/Halifax)'
    },
    {
      value: 'America/Moncton',
      text: 'Atlantic Standard Time (America/Moncton)'
    },
    { value: 'America/Thule', text: 'Atlantic Standard Time (America/Thule)' },
    {
      value: 'Atlantic/Bermuda',
      text: 'Atlantic Standard Time (Atlantic/Bermuda)'
    },
    { value: 'Asia/Baku', text: 'Azerbaijan Standard Time (Asia/Baku)' },
    {
      value: 'America/Scoresbysund',
      text: 'Azores Standard Time (America/Scoresbysund)'
    },
    {
      value: 'Atlantic/Azores',
      text: 'Azores Standard Time (Atlantic/Azores)'
    },
    { value: 'America/Bahia', text: 'Bahia Standard Time (America/Bahia)' },
    { value: 'Asia/Dhaka', text: 'Bangladesh Standard Time (Asia/Dhaka)' },
    { value: 'Asia/Thimphu', text: 'Bangladesh Standard Time (Asia/Thimphu)' },
    {
      value: 'America/Regina',
      text: 'Canada Central Standard Time (America/Regina)'
    },
    {
      value: 'America/Swift_Current',
      text: 'Canada Central Standard Time (America/Swift_Current)'
    },
    {
      value: 'Atlantic/Cape_Verde',
      text: 'Cape Verde Standard Time (Atlantic/Cape_Verde)'
    },
    { value: 'Etc/GMT+1', text: 'Cape Verde Standard Time (Etc/GMT+1)' },
    { value: 'Asia/Yerevan', text: 'Caucasus Standard Time (Asia/Yerevan)' },
    {
      value: 'Australia/Adelaide',
      text: 'Cen. Australia Standard Time (Australia/Adelaide)'
    },
    {
      value: 'Australia/Broken_Hill',
      text: 'Cen. Australia Standard Time (Australia/Broken_Hill)'
    },
    {
      value: 'America/Belize',
      text: 'Central America Standard Time (America/Belize)'
    },
    {
      value: 'America/Costa_Rica',
      text: 'Central America Standard Time (America/Costa_Rica)'
    },
    {
      value: 'America/El_Salvador',
      text: 'Central America Standard Time (America/El_Salvador)'
    },
    {
      value: 'America/Guatemala',
      text: 'Central America Standard Time (America/Guatemala)'
    },
    {
      value: 'America/Managua',
      text: 'Central America Standard Time (America/Managua)'
    },
    {
      value: 'America/Tegucigalpa',
      text: 'Central America Standard Time (America/Tegucigalpa)'
    },
    { value: 'Etc/GMT+6', text: 'Central America Standard Time (Etc/GMT+6)' },
    {
      value: 'Pacific/Galapagos',
      text: 'Central America Standard Time (Pacific/Galapagos)'
    },
    {
      value: 'Antarctica/Vostok',
      text: 'Central Asia Standard Time (Antarctica/Vostok)'
    },
    { value: 'Asia/Almaty', text: 'Central Asia Standard Time (Asia/Almaty)' },
    {
      value: 'Asia/Bishkek',
      text: 'Central Asia Standard Time (Asia/Bishkek)'
    },
    {
      value: 'Asia/Qyzylorda',
      text: 'Central Asia Standard Time (Asia/Qyzylorda)'
    },
    { value: 'Etc/GMT-6', text: 'Central Asia Standard Time (Etc/GMT-6)' },
    {
      value: 'Indian/Chagos',
      text: 'Central Asia Standard Time (Indian/Chagos)'
    },
    {
      value: 'America/Campo_Grande',
      text: 'Central Brazilian Standard Time (America/Campo_Grande)'
    },
    {
      value: 'America/Cuiaba',
      text: 'Central Brazilian Standard Time (America/Cuiaba)'
    },
    {
      value: 'Europe/Belgrade',
      text: 'Central Europe Standard Time (Europe/Belgrade)'
    },
    {
      value: 'Europe/Bratislava',
      text: 'Central Europe Standard Time (Europe/Bratislava)'
    },
    {
      value: 'Europe/Budapest',
      text: 'Central Europe Standard Time (Europe/Budapest)'
    },
    {
      value: 'Europe/Ljubljana',
      text: 'Central Europe Standard Time (Europe/Ljubljana)'
    },
    {
      value: 'Europe/Podgorica',
      text: 'Central Europe Standard Time (Europe/Podgorica)'
    },
    {
      value: 'Europe/Prague',
      text: 'Central Europe Standard Time (Europe/Prague)'
    },
    {
      value: 'Europe/Tirane',
      text: 'Central Europe Standard Time (Europe/Tirane)'
    },
    {
      value: 'Europe/Sarajevo',
      text: 'Central European Standard Time (Europe/Sarajevo)'
    },
    {
      value: 'Europe/Skopje',
      text: 'Central European Standard Time (Europe/Skopje)'
    },
    {
      value: 'Europe/Warsaw',
      text: 'Central European Standard Time (Europe/Warsaw)'
    },
    {
      value: 'Europe/Zagreb',
      text: 'Central European Standard Time (Europe/Zagreb)'
    },
    {
      value: 'Antarctica/Macquarie',
      text: 'Central Pacific Standard Time (Antarctica/Macquarie)'
    },
    { value: 'Etc/GMT-11', text: 'Central Pacific Standard Time (Etc/GMT-11)' },
    {
      value: 'Pacific/Efate',
      text: 'Central Pacific Standard Time (Pacific/Efate)'
    },
    {
      value: 'Pacific/Guadalcanal',
      text: 'Central Pacific Standard Time (Pacific/Guadalcanal)'
    },
    {
      value: 'Pacific/Kosrae',
      text: 'Central Pacific Standard Time (Pacific/Kosrae)'
    },
    {
      value: 'Pacific/Noumea',
      text: 'Central Pacific Standard Time (Pacific/Noumea)'
    },
    {
      value: 'Pacific/Ponape',
      text: 'Central Pacific Standard Time (Pacific/Ponape)'
    },
    {
      value: 'America/Chicago',
      text: 'Central Standard Time (America/Chicago)'
    },
    {
      value: 'America/Indiana/Knox',
      text: 'Central Standard Time (America/Indiana/Knox)'
    },
    {
      value: 'America/Indiana/Tell_City',
      text: 'Central Standard Time (America/Indiana/Tell_City)'
    },
    {
      value: 'America/Matamoros',
      text: 'Central Standard Time (America/Matamoros)'
    },
    {
      value: 'America/Menominee',
      text: 'Central Standard Time (America/Menominee)'
    },
    {
      value: 'America/North_Dakota/Beulah',
      text: 'Central Standard Time (America/North_Dakota/Beulah)'
    },
    {
      value: 'America/North_Dakota/Center',
      text: 'Central Standard Time (America/North_Dakota/Center)'
    },
    {
      value: 'America/North_Dakota/New_Salem',
      text: 'Central Standard Time (America/North_Dakota/New_Salem)'
    },
    {
      value: 'America/Rainy_River',
      text: 'Central Standard Time (America/Rainy_River)'
    },
    {
      value: 'America/Rankin_Inlet',
      text: 'Central Standard Time (America/Rankin_Inlet)'
    },
    {
      value: 'America/Resolute',
      text: 'Central Standard Time (America/Resolute)'
    },
    {
      value: 'America/Winnipeg',
      text: 'Central Standard Time (America/Winnipeg)'
    },
    { value: 'CST6CDT', text: 'Central Standard Time (CST6CDT)' },
    {
      value: 'America/Bahia_Banderas',
      text: 'Central Standard Time (Mexico) (America/Bahia_Banderas)'
    },
    {
      value: 'America/Cancun',
      text: 'Central Standard Time (Mexico) (America/Cancun)'
    },
    {
      value: 'America/Merida',
      text: 'Central Standard Time (Mexico) (America/Merida)'
    },
    {
      value: 'America/Mexico_City',
      text: 'Central Standard Time (Mexico) (America/Mexico_City)'
    },
    {
      value: 'America/Monterrey',
      text: 'Central Standard Time (Mexico) (America/Monterrey)'
    },
    { value: 'Asia/Chongqing', text: 'China Standard Time (Asia/Chongqing)' },
    { value: 'Asia/Harbin', text: 'China Standard Time (Asia/Harbin)' },
    { value: 'Asia/Hong_Kong', text: 'China Standard Time (Asia/Hong_Kong)' },
    { value: 'Asia/Kashgar', text: 'China Standard Time (Asia/Kashgar)' },
    { value: 'Asia/Macau', text: 'China Standard Time (Asia/Macau)' },
    { value: 'Asia/Shanghai', text: 'China Standard Time (Asia/Shanghai)' },
    { value: 'Asia/Urumqi', text: 'China Standard Time (Asia/Urumqi)' },
    { value: 'Etc/GMT+12', text: 'Dateline Standard Time (Etc/GMT+12)' },
    {
      value: 'Africa/Addis_Ababa',
      text: 'E. Africa Standard Time (Africa/Addis_Ababa)'
    },
    { value: 'Africa/Asmera', text: 'E. Africa Standard Time (Africa/Asmera)' },
    {
      value: 'Africa/Dar_es_Salaam',
      text: 'E. Africa Standard Time (Africa/Dar_es_Salaam)'
    },
    {
      value: 'Africa/Djibouti',
      text: 'E. Africa Standard Time (Africa/Djibouti)'
    },
    { value: 'Africa/Juba', text: 'E. Africa Standard Time (Africa/Juba)' },
    {
      value: 'Africa/Kampala',
      text: 'E. Africa Standard Time (Africa/Kampala)'
    },
    {
      value: 'Africa/Khartoum',
      text: 'E. Africa Standard Time (Africa/Khartoum)'
    },
    {
      value: 'Africa/Mogadishu',
      text: 'E. Africa Standard Time (Africa/Mogadishu)'
    },
    {
      value: 'Africa/Nairobi',
      text: 'E. Africa Standard Time (Africa/Nairobi)'
    },
    {
      value: 'Antarctica/Syowa',
      text: 'E. Africa Standard Time (Antarctica/Syowa)'
    },
    { value: 'Etc/GMT-3', text: 'E. Africa Standard Time (Etc/GMT-3)' },
    {
      value: 'Indian/Antananarivo',
      text: 'E. Africa Standard Time (Indian/Antananarivo)'
    },
    { value: 'Indian/Comoro', text: 'E. Africa Standard Time (Indian/Comoro)' },
    {
      value: 'Indian/Mayotte',
      text: 'E. Africa Standard Time (Indian/Mayotte)'
    },
    {
      value: 'Australia/Brisbane',
      text: 'E. Australia Standard Time (Australia/Brisbane)'
    },
    {
      value: 'Australia/Lindeman',
      text: 'E. Australia Standard Time (Australia/Lindeman)'
    },
    {
      value: 'America/Sao_Paulo',
      text: 'E. South America Standard Time (America/Sao_Paulo)'
    },
    {
      value: 'America/Detroit',
      text: 'Eastern Standard Time (America/Detroit)'
    },
    {
      value: 'America/Grand_Turk',
      text: 'Eastern Standard Time (America/Grand_Turk)'
    },
    { value: 'America/Havana', text: 'Eastern Standard Time (America/Havana)' },
    {
      value: 'America/Indiana/Petersburg',
      text: 'Eastern Standard Time (America/Indiana/Petersburg)'
    },
    {
      value: 'America/Indiana/Vincennes',
      text: 'Eastern Standard Time (America/Indiana/Vincennes)'
    },
    {
      value: 'America/Indiana/Winamac',
      text: 'Eastern Standard Time (America/Indiana/Winamac)'
    },
    {
      value: 'America/Iqaluit',
      text: 'Eastern Standard Time (America/Iqaluit)'
    },
    {
      value: 'America/Kentucky/Monticello',
      text: 'Eastern Standard Time (America/Kentucky/Monticello)'
    },
    {
      value: 'America/Louisville',
      text: 'Eastern Standard Time (America/Louisville)'
    },
    {
      value: 'America/Montreal',
      text: 'Eastern Standard Time (America/Montreal)'
    },
    { value: 'America/Nassau', text: 'Eastern Standard Time (America/Nassau)' },
    {
      value: 'America/New_York',
      text: 'Eastern Standard Time (America/New_York)'
    },
    {
      value: 'America/Nipigon',
      text: 'Eastern Standard Time (America/Nipigon)'
    },
    {
      value: 'America/Pangnirtung',
      text: 'Eastern Standard Time (America/Pangnirtung)'
    },
    {
      value: 'America/Port-au-Prince',
      text: 'Eastern Standard Time (America/Port-au-Prince)'
    },
    {
      value: 'America/Thunder_Bay',
      text: 'Eastern Standard Time (America/Thunder_Bay)'
    },
    {
      value: 'America/Toronto',
      text: 'Eastern Standard Time (America/Toronto)'
    },
    { value: 'EST5EDT', text: 'Eastern Standard Time (EST5EDT)' },
    { value: 'Africa/Cairo', text: 'Egypt Standard Time (Africa/Cairo)' },
    {
      value: 'Asia/Yekaterinburg',
      text: 'Ekaterinburg Standard Time (Asia/Yekaterinburg)'
    },
    { value: 'Europe/Helsinki', text: 'FLE Standard Time (Europe/Helsinki)' },
    { value: 'Europe/Kiev', text: 'FLE Standard Time (Europe/Kiev)' },
    { value: 'Europe/Mariehamn', text: 'FLE Standard Time (Europe/Mariehamn)' },
    { value: 'Europe/Riga', text: 'FLE Standard Time (Europe/Riga)' },
    {
      value: 'Europe/Simferopol',
      text: 'FLE Standard Time (Europe/Simferopol)'
    },
    { value: 'Europe/Sofia', text: 'FLE Standard Time (Europe/Sofia)' },
    { value: 'Europe/Tallinn', text: 'FLE Standard Time (Europe/Tallinn)' },
    { value: 'Europe/Uzhgorod', text: 'FLE Standard Time (Europe/Uzhgorod)' },
    { value: 'Europe/Vilnius', text: 'FLE Standard Time (Europe/Vilnius)' },
    {
      value: 'Europe/Zaporozhye',
      text: 'FLE Standard Time (Europe/Zaporozhye)'
    },
    { value: 'Pacific/Fiji', text: 'Fiji Standard Time (Pacific/Fiji)' },
    { value: 'Atlantic/Canary', text: 'GMT Standard Time (Atlantic/Canary)' },
    { value: 'Atlantic/Faeroe', text: 'GMT Standard Time (Atlantic/Faeroe)' },
    { value: 'Atlantic/Madeira', text: 'GMT Standard Time (Atlantic/Madeira)' },
    { value: 'Europe/Dublin', text: 'GMT Standard Time (Europe/Dublin)' },
    { value: 'Europe/Guernsey', text: 'GMT Standard Time (Europe/Guernsey)' },
    {
      value: 'Europe/Isle_of_Man',
      text: 'GMT Standard Time (Europe/Isle_of_Man)'
    },
    { value: 'Europe/Jersey', text: 'GMT Standard Time (Europe/Jersey)' },
    { value: 'Europe/Lisbon', text: 'GMT Standard Time (Europe/Lisbon)' },
    { value: 'Europe/London', text: 'GMT Standard Time (Europe/London)' },
    { value: 'Asia/Nicosia', text: 'GTB Standard Time (Asia/Nicosia)' },
    { value: 'Europe/Athens', text: 'GTB Standard Time (Europe/Athens)' },
    { value: 'Europe/Bucharest', text: 'GTB Standard Time (Europe/Bucharest)' },
    { value: 'Europe/Chisinau', text: 'GTB Standard Time (Europe/Chisinau)' },
    { value: 'Asia/Tbilisi', text: 'Georgian Standard Time (Asia/Tbilisi)' },
    {
      value: 'America/Godthab',
      text: 'Greenland Standard Time (America/Godthab)'
    },
    {
      value: 'Africa/Abidjan',
      text: 'Greenwich Standard Time (Africa/Abidjan)'
    },
    { value: 'Africa/Accra', text: 'Greenwich Standard Time (Africa/Accra)' },
    { value: 'Africa/Bamako', text: 'Greenwich Standard Time (Africa/Bamako)' },
    { value: 'Africa/Banjul', text: 'Greenwich Standard Time (Africa/Banjul)' },
    { value: 'Africa/Bissau', text: 'Greenwich Standard Time (Africa/Bissau)' },
    {
      value: 'Africa/Conakry',
      text: 'Greenwich Standard Time (Africa/Conakry)'
    },
    { value: 'Africa/Dakar', text: 'Greenwich Standard Time (Africa/Dakar)' },
    {
      value: 'Africa/Freetown',
      text: 'Greenwich Standard Time (Africa/Freetown)'
    },
    { value: 'Africa/Lome', text: 'Greenwich Standard Time (Africa/Lome)' },
    {
      value: 'Africa/Monrovia',
      text: 'Greenwich Standard Time (Africa/Monrovia)'
    },
    {
      value: 'Africa/Nouakchott',
      text: 'Greenwich Standard Time (Africa/Nouakchott)'
    },
    {
      value: 'Africa/Ouagadougou',
      text: 'Greenwich Standard Time (Africa/Ouagadougou)'
    },
    {
      value: 'Africa/Sao_Tome',
      text: 'Greenwich Standard Time (Africa/Sao_Tome)'
    },
    {
      value: 'Atlantic/Reykjavik',
      text: 'Greenwich Standard Time (Atlantic/Reykjavik)'
    },
    {
      value: 'Atlantic/St_Helena',
      text: 'Greenwich Standard Time (Atlantic/St_Helena)'
    },
    { value: 'Etc/GMT+10', text: 'Hawaiian Standard Time (Etc/GMT+10)' },
    {
      value: 'Pacific/Honolulu',
      text: 'Hawaiian Standard Time (Pacific/Honolulu)'
    },
    {
      value: 'Pacific/Johnston',
      text: 'Hawaiian Standard Time (Pacific/Johnston)'
    },
    {
      value: 'Pacific/Rarotonga',
      text: 'Hawaiian Standard Time (Pacific/Rarotonga)'
    },
    {
      value: 'Pacific/Tahiti',
      text: 'Hawaiian Standard Time (Pacific/Tahiti)'
    },
    { value: 'Asia/Calcutta', text: 'India Standard Time (Asia/Calcutta)' },
    { value: 'Asia/Tehran', text: 'Iran Standard Time (Asia/Tehran)' },
    { value: 'Asia/Jerusalem', text: 'Israel Standard Time (Asia/Jerusalem)' },
    { value: 'Asia/Amman', text: 'Jordan Standard Time (Asia/Amman)' },
    {
      value: 'Europe/Kaliningrad',
      text: 'Kaliningrad Standard Time (Europe/Kaliningrad)'
    },
    { value: 'Europe/Minsk', text: 'Kaliningrad Standard Time (Europe/Minsk)' },
    { value: 'Asia/Pyongyang', text: 'Korea Standard Time (Asia/Pyongyang)' },
    { value: 'Asia/Seoul', text: 'Korea Standard Time (Asia/Seoul)' },
    { value: 'Africa/Tripoli', text: 'Libya Standard Time (Africa/Tripoli)' },
    { value: 'Asia/Anadyr', text: 'Magadan Standard Time (Asia/Anadyr)' },
    { value: 'Asia/Kamchatka', text: 'Magadan Standard Time (Asia/Kamchatka)' },
    { value: 'Asia/Magadan', text: 'Magadan Standard Time (Asia/Magadan)' },
    { value: 'Indian/Mahe', text: 'Mauritius Standard Time (Indian/Mahe)' },
    {
      value: 'Indian/Mauritius',
      text: 'Mauritius Standard Time (Indian/Mauritius)'
    },
    {
      value: 'Indian/Reunion',
      text: 'Mauritius Standard Time (Indian/Reunion)'
    },
    { value: 'Asia/Beirut', text: 'Middle East Standard Time (Asia/Beirut)' },
    {
      value: 'America/Montevideo',
      text: 'Montevideo Standard Time (America/Montevideo)'
    },
    {
      value: 'Africa/Casablanca',
      text: 'Morocco Standard Time (Africa/Casablanca)'
    },
    {
      value: 'Africa/El_Aaiun',
      text: 'Morocco Standard Time (Africa/El_Aaiun)'
    },
    { value: 'America/Boise', text: 'Mountain Standard Time (America/Boise)' },
    {
      value: 'America/Cambridge_Bay',
      text: 'Mountain Standard Time (America/Cambridge_Bay)'
    },
    {
      value: 'America/Denver',
      text: 'Mountain Standard Time (America/Denver)'
    },
    {
      value: 'America/Edmonton',
      text: 'Mountain Standard Time (America/Edmonton)'
    },
    {
      value: 'America/Inuvik',
      text: 'Mountain Standard Time (America/Inuvik)'
    },
    {
      value: 'America/Ojinaga',
      text: 'Mountain Standard Time (America/Ojinaga)'
    },
    {
      value: 'America/Shiprock',
      text: 'Mountain Standard Time (America/Shiprock)'
    },
    {
      value: 'America/Yellowknife',
      text: 'Mountain Standard Time (America/Yellowknife)'
    },
    { value: 'MST7MDT', text: 'Mountain Standard Time (MST7MDT)' },
    {
      value: 'America/Chihuahua',
      text: 'Mountain Standard Time (Mexico) (America/Chihuahua)'
    },
    {
      value: 'America/Mazatlan',
      text: 'Mountain Standard Time (Mexico) (America/Mazatlan)'
    },
    { value: 'Asia/Rangoon', text: 'Myanmar Standard Time (Asia/Rangoon)' },
    { value: 'Indian/Cocos', text: 'Myanmar Standard Time (Indian/Cocos)' },
    {
      value: 'Asia/Novokuznetsk',
      text: 'N. Central Asia Standard Time (Asia/Novokuznetsk)'
    },
    {
      value: 'Asia/Novosibirsk',
      text: 'N. Central Asia Standard Time (Asia/Novosibirsk)'
    },
    { value: 'Asia/Omsk', text: 'N. Central Asia Standard Time (Asia/Omsk)' },
    {
      value: 'Africa/Windhoek',
      text: 'Namibia Standard Time (Africa/Windhoek)'
    },
    { value: 'Asia/Katmandu', text: 'Nepal Standard Time (Asia/Katmandu)' },
    {
      value: 'Antarctica/McMurdo',
      text: 'New Zealand Standard Time (Antarctica/McMurdo)'
    },
    {
      value: 'Antarctica/South_Pole',
      text: 'New Zealand Standard Time (Antarctica/South_Pole)'
    },
    {
      value: 'Pacific/Auckland',
      text: 'New Zealand Standard Time (Pacific/Auckland)'
    },
    {
      value: 'America/St_Johns',
      text: 'Newfoundland Standard Time (America/St_Johns)'
    },
    {
      value: 'Asia/Irkutsk',
      text: 'North Asia East Standard Time (Asia/Irkutsk)'
    },
    {
      value: 'Asia/Krasnoyarsk',
      text: 'North Asia Standard Time (Asia/Krasnoyarsk)'
    },
    {
      value: 'America/Santiago',
      text: 'Pacific SA Standard Time (America/Santiago)'
    },
    {
      value: 'Antarctica/Palmer',
      text: 'Pacific SA Standard Time (Antarctica/Palmer)'
    },
    { value: 'America/Dawson', text: 'Pacific Standard Time (America/Dawson)' },
    {
      value: 'America/Los_Angeles',
      text: 'Pacific Standard Time (America/Los_Angeles)'
    },
    {
      value: 'America/Tijuana',
      text: 'Pacific Standard Time (America/Tijuana)'
    },
    {
      value: 'America/Vancouver',
      text: 'Pacific Standard Time (America/Vancouver)'
    },
    {
      value: 'America/Whitehorse',
      text: 'Pacific Standard Time (America/Whitehorse)'
    },
    {
      value: 'America/Santa_Isabel',
      text: 'Pacific Standard Time (Mexico) (America/Santa_Isabel)'
    },
    { value: 'PST8PDT', text: 'Pacific Standard Time (PST8PDT)' },
    { value: 'Asia/Karachi', text: 'Pakistan Standard Time (Asia/Karachi)' },
    {
      value: 'America/Asuncion',
      text: 'Paraguay Standard Time (America/Asuncion)'
    },
    { value: 'Africa/Ceuta', text: 'Romance Standard Time (Africa/Ceuta)' },
    {
      value: 'Europe/Brussels',
      text: 'Romance Standard Time (Europe/Brussels)'
    },
    {
      value: 'Europe/Copenhagen',
      text: 'Romance Standard Time (Europe/Copenhagen)'
    },
    { value: 'Europe/Madrid', text: 'Romance Standard Time (Europe/Madrid)' },
    { value: 'Europe/Paris', text: 'Romance Standard Time (Europe/Paris)' },
    { value: 'Europe/Moscow', text: 'Russian Standard Time (Europe/Moscow)' },
    { value: 'Europe/Samara', text: 'Russian Standard Time (Europe/Samara)' },
    {
      value: 'Europe/Volgograd',
      text: 'Russian Standard Time (Europe/Volgograd)'
    },
    {
      value: 'America/Araguaina',
      text: 'SA Eastern Standard Time (America/Araguaina)'
    },
    {
      value: 'America/Belem',
      text: 'SA Eastern Standard Time (America/Belem)'
    },
    {
      value: 'America/Cayenne',
      text: 'SA Eastern Standard Time (America/Cayenne)'
    },
    {
      value: 'America/Fortaleza',
      text: 'SA Eastern Standard Time (America/Fortaleza)'
    },
    {
      value: 'America/Maceio',
      text: 'SA Eastern Standard Time (America/Maceio)'
    },
    {
      value: 'America/Paramaribo',
      text: 'SA Eastern Standard Time (America/Paramaribo)'
    },
    {
      value: 'America/Recife',
      text: 'SA Eastern Standard Time (America/Recife)'
    },
    {
      value: 'America/Santarem',
      text: 'SA Eastern Standard Time (America/Santarem)'
    },
    {
      value: 'Antarctica/Rothera',
      text: 'SA Eastern Standard Time (Antarctica/Rothera)'
    },
    {
      value: 'Atlantic/Stanley',
      text: 'SA Eastern Standard Time (Atlantic/Stanley)'
    },
    { value: 'Etc/GMT+3', text: 'SA Eastern Standard Time (Etc/GMT+3)' },
    {
      value: 'America/Bogota',
      text: 'SA Pacific Standard Time (America/Bogota)'
    },
    {
      value: 'America/Cayman',
      text: 'SA Pacific Standard Time (America/Cayman)'
    },
    {
      value: 'America/Coral_Harbour',
      text: 'SA Pacific Standard Time (America/Coral_Harbour)'
    },
    {
      value: 'America/Eirunepe',
      text: 'SA Pacific Standard Time (America/Eirunepe)'
    },
    {
      value: 'America/Guayaquil',
      text: 'SA Pacific Standard Time (America/Guayaquil)'
    },
    {
      value: 'America/Jamaica',
      text: 'SA Pacific Standard Time (America/Jamaica)'
    },
    { value: 'America/Lima', text: 'SA Pacific Standard Time (America/Lima)' },
    {
      value: 'America/Panama',
      text: 'SA Pacific Standard Time (America/Panama)'
    },
    {
      value: 'America/Rio_Branco',
      text: 'SA Pacific Standard Time (America/Rio_Branco)'
    },
    { value: 'Etc/GMT+5', text: 'SA Pacific Standard Time (Etc/GMT+5)' },
    {
      value: 'America/Anguilla',
      text: 'SA Western Standard Time (America/Anguilla)'
    },
    {
      value: 'America/Antigua',
      text: 'SA Western Standard Time (America/Antigua)'
    },
    {
      value: 'America/Aruba',
      text: 'SA Western Standard Time (America/Aruba)'
    },
    {
      value: 'America/Barbados',
      text: 'SA Western Standard Time (America/Barbados)'
    },
    {
      value: 'America/Blanc-Sablon',
      text: 'SA Western Standard Time (America/Blanc-Sablon)'
    },
    {
      value: 'America/Boa_Vista',
      text: 'SA Western Standard Time (America/Boa_Vista)'
    },
    {
      value: 'America/Curacao',
      text: 'SA Western Standard Time (America/Curacao)'
    },
    {
      value: 'America/Dominica',
      text: 'SA Western Standard Time (America/Dominica)'
    },
    {
      value: 'America/Grenada',
      text: 'SA Western Standard Time (America/Grenada)'
    },
    {
      value: 'America/Guadeloupe',
      text: 'SA Western Standard Time (America/Guadeloupe)'
    },
    {
      value: 'America/Guyana',
      text: 'SA Western Standard Time (America/Guyana)'
    },
    {
      value: 'America/Kralendijk',
      text: 'SA Western Standard Time (America/Kralendijk)'
    },
    {
      value: 'America/La_Paz',
      text: 'SA Western Standard Time (America/La_Paz)'
    },
    {
      value: 'America/Lower_Princes',
      text: 'SA Western Standard Time (America/Lower_Princes)'
    },
    {
      value: 'America/Manaus',
      text: 'SA Western Standard Time (America/Manaus)'
    },
    {
      value: 'America/Marigot',
      text: 'SA Western Standard Time (America/Marigot)'
    },
    {
      value: 'America/Martinique',
      text: 'SA Western Standard Time (America/Martinique)'
    },
    {
      value: 'America/Montserrat',
      text: 'SA Western Standard Time (America/Montserrat)'
    },
    {
      value: 'America/Port_of_Spain',
      text: 'SA Western Standard Time (America/Port_of_Spain)'
    },
    {
      value: 'America/Porto_Velho',
      text: 'SA Western Standard Time (America/Porto_Velho)'
    },
    {
      value: 'America/Puerto_Rico',
      text: 'SA Western Standard Time (America/Puerto_Rico)'
    },
    {
      value: 'America/Santo_Domingo',
      text: 'SA Western Standard Time (America/Santo_Domingo)'
    },
    {
      value: 'America/St_Barthelemy',
      text: 'SA Western Standard Time (America/St_Barthelemy)'
    },
    {
      value: 'America/St_Kitts',
      text: 'SA Western Standard Time (America/St_Kitts)'
    },
    {
      value: 'America/St_Lucia',
      text: 'SA Western Standard Time (America/St_Lucia)'
    },
    {
      value: 'America/St_Thomas',
      text: 'SA Western Standard Time (America/St_Thomas)'
    },
    {
      value: 'America/St_Vincent',
      text: 'SA Western Standard Time (America/St_Vincent)'
    },
    {
      value: 'America/Tortola',
      text: 'SA Western Standard Time (America/Tortola)'
    },
    { value: 'Etc/GMT+4', text: 'SA Western Standard Time (Etc/GMT+4)' },
    {
      value: 'Antarctica/Davis',
      text: 'SE Asia Standard Time (Antarctica/Davis)'
    },
    { value: 'Asia/Bangkok', text: 'SE Asia Standard Time (Asia/Bangkok)' },
    { value: 'Asia/Hovd', text: 'SE Asia Standard Time (Asia/Hovd)' },
    { value: 'Asia/Jakarta', text: 'SE Asia Standard Time (Asia/Jakarta)' },
    {
      value: 'Asia/Phnom_Penh',
      text: 'SE Asia Standard Time (Asia/Phnom_Penh)'
    },
    { value: 'Asia/Pontianak', text: 'SE Asia Standard Time (Asia/Pontianak)' },
    { value: 'Asia/Saigon', text: 'SE Asia Standard Time (Asia/Saigon)' },
    { value: 'Asia/Vientiane', text: 'SE Asia Standard Time (Asia/Vientiane)' },
    { value: 'Etc/GMT-7', text: 'SE Asia Standard Time (Etc/GMT-7)' },
    {
      value: 'Indian/Christmas',
      text: 'SE Asia Standard Time (Indian/Christmas)'
    },
    { value: 'Pacific/Apia', text: 'Samoa Standard Time (Pacific/Apia)' },
    { value: 'Asia/Brunei', text: 'Singapore Standard Time (Asia/Brunei)' },
    {
      value: 'Asia/Kuala_Lumpur',
      text: 'Singapore Standard Time (Asia/Kuala_Lumpur)'
    },
    { value: 'Asia/Kuching', text: 'Singapore Standard Time (Asia/Kuching)' },
    { value: 'Asia/Makassar', text: 'Singapore Standard Time (Asia/Makassar)' },
    { value: 'Asia/Manila', text: 'Singapore Standard Time (Asia/Manila)' },
    {
      value: 'Asia/Singapore',
      text: 'Singapore Standard Time (Asia/Singapore)'
    },
    { value: 'Etc/GMT-8', text: 'Singapore Standard Time (Etc/GMT-8)' },
    {
      value: 'Africa/Blantyre',
      text: 'South Africa Standard Time (Africa/Blantyre)'
    },
    {
      value: 'Africa/Bujumbura',
      text: 'South Africa Standard Time (Africa/Bujumbura)'
    },
    {
      value: 'Africa/Gaborone',
      text: 'South Africa Standard Time (Africa/Gaborone)'
    },
    {
      value: 'Africa/Harare',
      text: 'South Africa Standard Time (Africa/Harare)'
    },
    {
      value: 'Africa/Johannesburg',
      text: 'South Africa Standard Time (Africa/Johannesburg)'
    },
    {
      value: 'Africa/Kigali',
      text: 'South Africa Standard Time (Africa/Kigali)'
    },
    {
      value: 'Africa/Lubumbashi',
      text: 'South Africa Standard Time (Africa/Lubumbashi)'
    },
    {
      value: 'Africa/Lusaka',
      text: 'South Africa Standard Time (Africa/Lusaka)'
    },
    {
      value: 'Africa/Maputo',
      text: 'South Africa Standard Time (Africa/Maputo)'
    },
    {
      value: 'Africa/Maseru',
      text: 'South Africa Standard Time (Africa/Maseru)'
    },
    {
      value: 'Africa/Mbabane',
      text: 'South Africa Standard Time (Africa/Mbabane)'
    },
    { value: 'Etc/GMT-2', text: 'South Africa Standard Time (Etc/GMT-2)' },
    { value: 'Asia/Colombo', text: 'Sri Lanka Standard Time (Asia/Colombo)' },
    { value: 'Asia/Damascus', text: 'Syria Standard Time (Asia/Damascus)' },
    { value: 'Asia/Taipei', text: 'Taipei Standard Time (Asia/Taipei)' },
    {
      value: 'Australia/Currie',
      text: 'Tasmania Standard Time (Australia/Currie)'
    },
    {
      value: 'Australia/Hobart',
      text: 'Tasmania Standard Time (Australia/Hobart)'
    },
    { value: 'Asia/Dili', text: 'Tokyo Standard Time (Asia/Dili)' },
    { value: 'Asia/Jayapura', text: 'Tokyo Standard Time (Asia/Jayapura)' },
    { value: 'Asia/Tokyo', text: 'Tokyo Standard Time (Asia/Tokyo)' },
    { value: 'Etc/GMT-9', text: 'Tokyo Standard Time (Etc/GMT-9)' },
    { value: 'Pacific/Palau', text: 'Tokyo Standard Time (Pacific/Palau)' },
    { value: 'Etc/GMT-13', text: 'Tonga Standard Time (Etc/GMT-13)' },
    {
      value: 'Pacific/Enderbury',
      text: 'Tonga Standard Time (Pacific/Enderbury)'
    },
    { value: 'Pacific/Fakaofo', text: 'Tonga Standard Time (Pacific/Fakaofo)' },
    {
      value: 'Pacific/Tongatapu',
      text: 'Tonga Standard Time (Pacific/Tongatapu)'
    },
    {
      value: 'Europe/Istanbul',
      text: 'Turkey Standard Time (Europe/Istanbul)'
    },
    {
      value: 'America/Indiana/Marengo',
      text: 'US Eastern Standard Time (America/Indiana/Marengo)'
    },
    {
      value: 'America/Indiana/Vevay',
      text: 'US Eastern Standard Time (America/Indiana/Vevay)'
    },
    {
      value: 'America/Indianapolis',
      text: 'US Eastern Standard Time (America/Indianapolis)'
    },
    {
      value: 'America/Creston',
      text: 'US Mountain Standard Time (America/Creston)'
    },
    {
      value: 'America/Dawson_Creek',
      text: 'US Mountain Standard Time (America/Dawson_Creek)'
    },
    {
      value: 'America/Hermosillo',
      text: 'US Mountain Standard Time (America/Hermosillo)'
    },
    {
      value: 'America/Phoenix',
      text: 'US Mountain Standard Time (America/Phoenix)'
    },
    { value: 'Etc/GMT+7', text: 'US Mountain Standard Time (Etc/GMT+7)' },
    { value: 'America/Danmarkshavn', text: 'UTC (America/Danmarkshavn)' },
    { value: 'Etc/GMT', text: 'UTC (Etc/GMT)' },
    { value: 'Etc/GMT-12', text: 'UTC+12 (Etc/GMT-12)' },
    { value: 'Pacific/Funafuti', text: 'UTC+12 (Pacific/Funafuti)' },
    { value: 'Pacific/Kwajalein', text: 'UTC+12 (Pacific/Kwajalein)' },
    { value: 'Pacific/Majuro', text: 'UTC+12 (Pacific/Majuro)' },
    { value: 'Pacific/Nauru', text: 'UTC+12 (Pacific/Nauru)' },
    { value: 'Pacific/Tarawa', text: 'UTC+12 (Pacific/Tarawa)' },
    { value: 'Pacific/Wake', text: 'UTC+12 (Pacific/Wake)' },
    { value: 'Pacific/Wallis', text: 'UTC+12 (Pacific/Wallis)' },
    { value: 'America/Noronha', text: 'UTC-02 (America/Noronha)' },
    {
      value: 'Atlantic/South_Georgia',
      text: 'UTC-02 (Atlantic/South_Georgia)'
    },
    { value: 'Etc/GMT+2', text: 'UTC-02 (Etc/GMT+2)' },
    { value: 'Etc/GMT+11', text: 'UTC-11 (Etc/GMT+11)' },
    { value: 'Pacific/Midway', text: 'UTC-11 (Pacific/Midway)' },
    { value: 'Pacific/Niue', text: 'UTC-11 (Pacific/Niue)' },
    { value: 'Pacific/Pago_Pago', text: 'UTC-11 (Pacific/Pago_Pago)' },
    {
      value: 'Asia/Choibalsan',
      text: 'Ulaanbaatar Standard Time (Asia/Choibalsan)'
    },
    {
      value: 'Asia/Ulaanbaatar',
      text: 'Ulaanbaatar Standard Time (Asia/Ulaanbaatar)'
    },
    {
      value: 'America/Caracas',
      text: 'Venezuela Standard Time (America/Caracas)'
    },
    {
      value: 'Asia/Sakhalin',
      text: 'Vladivostok Standard Time (Asia/Sakhalin)'
    },
    {
      value: 'Asia/Ust-Nera',
      text: 'Vladivostok Standard Time (Asia/Ust-Nera)'
    },
    {
      value: 'Asia/Vladivostok',
      text: 'Vladivostok Standard Time (Asia/Vladivostok)'
    },
    {
      value: 'Antarctica/Casey',
      text: 'W. Australia Standard Time (Antarctica/Casey)'
    },
    {
      value: 'Australia/Perth',
      text: 'W. Australia Standard Time (Australia/Perth)'
    },
    {
      value: 'Africa/Algiers',
      text: 'W. Central Africa Standard Time (Africa/Algiers)'
    },
    {
      value: 'Africa/Bangui',
      text: 'W. Central Africa Standard Time (Africa/Bangui)'
    },
    {
      value: 'Africa/Brazzaville',
      text: 'W. Central Africa Standard Time (Africa/Brazzaville)'
    },
    {
      value: 'Africa/Douala',
      text: 'W. Central Africa Standard Time (Africa/Douala)'
    },
    {
      value: 'Africa/Kinshasa',
      text: 'W. Central Africa Standard Time (Africa/Kinshasa)'
    },
    {
      value: 'Africa/Lagos',
      text: 'W. Central Africa Standard Time (Africa/Lagos)'
    },
    {
      value: 'Africa/Libreville',
      text: 'W. Central Africa Standard Time (Africa/Libreville)'
    },
    {
      value: 'Africa/Luanda',
      text: 'W. Central Africa Standard Time (Africa/Luanda)'
    },
    {
      value: 'Africa/Malabo',
      text: 'W. Central Africa Standard Time (Africa/Malabo)'
    },
    {
      value: 'Africa/Ndjamena',
      text: 'W. Central Africa Standard Time (Africa/Ndjamena)'
    },
    {
      value: 'Africa/Niamey',
      text: 'W. Central Africa Standard Time (Africa/Niamey)'
    },
    {
      value: 'Africa/Porto-Novo',
      text: 'W. Central Africa Standard Time (Africa/Porto-Novo)'
    },
    {
      value: 'Africa/Tunis',
      text: 'W. Central Africa Standard Time (Africa/Tunis)'
    },
    { value: 'Etc/GMT-1', text: 'W. Central Africa Standard Time (Etc/GMT-1)' },
    {
      value: 'Arctic/Longyearbyen',
      text: 'W. Europe Standard Time (Arctic/Longyearbyen)'
    },
    {
      value: 'Europe/Amsterdam',
      text: 'W. Europe Standard Time (Europe/Amsterdam)'
    },
    {
      value: 'Europe/Andorra',
      text: 'W. Europe Standard Time (Europe/Andorra)'
    },
    { value: 'Europe/Berlin', text: 'W. Europe Standard Time (Europe/Berlin)' },
    {
      value: 'Europe/Busingen',
      text: 'W. Europe Standard Time (Europe/Busingen)'
    },
    {
      value: 'Europe/Gibraltar',
      text: 'W. Europe Standard Time (Europe/Gibraltar)'
    },
    {
      value: 'Europe/Luxembourg',
      text: 'W. Europe Standard Time (Europe/Luxembourg)'
    },
    { value: 'Europe/Malta', text: 'W. Europe Standard Time (Europe/Malta)' },
    { value: 'Europe/Monaco', text: 'W. Europe Standard Time (Europe/Monaco)' },
    { value: 'Europe/Oslo', text: 'W. Europe Standard Time (Europe/Oslo)' },
    { value: 'Europe/Rome', text: 'W. Europe Standard Time (Europe/Rome)' },
    {
      value: 'Europe/San_Marino',
      text: 'W. Europe Standard Time (Europe/San_Marino)'
    },
    {
      value: 'Europe/Stockholm',
      text: 'W. Europe Standard Time (Europe/Stockholm)'
    },
    { value: 'Europe/Vaduz', text: 'W. Europe Standard Time (Europe/Vaduz)' },
    {
      value: 'Europe/Vatican',
      text: 'W. Europe Standard Time (Europe/Vatican)'
    },
    { value: 'Europe/Vienna', text: 'W. Europe Standard Time (Europe/Vienna)' },
    { value: 'Europe/Zurich', text: 'W. Europe Standard Time (Europe/Zurich)' },
    {
      value: 'Antarctica/Mawson',
      text: 'West Asia Standard Time (Antarctica/Mawson)'
    },
    { value: 'Asia/Aqtau', text: 'West Asia Standard Time (Asia/Aqtau)' },
    { value: 'Asia/Aqtobe', text: 'West Asia Standard Time (Asia/Aqtobe)' },
    { value: 'Asia/Ashgabat', text: 'West Asia Standard Time (Asia/Ashgabat)' },
    { value: 'Asia/Dushanbe', text: 'West Asia Standard Time (Asia/Dushanbe)' },
    { value: 'Asia/Oral', text: 'West Asia Standard Time (Asia/Oral)' },
    {
      value: 'Asia/Samarkand',
      text: 'West Asia Standard Time (Asia/Samarkand)'
    },
    { value: 'Asia/Tashkent', text: 'West Asia Standard Time (Asia/Tashkent)' },
    { value: 'Etc/GMT-5', text: 'West Asia Standard Time (Etc/GMT-5)' },
    {
      value: 'Indian/Kerguelen',
      text: 'West Asia Standard Time (Indian/Kerguelen)'
    },
    {
      value: 'Indian/Maldives',
      text: 'West Asia Standard Time (Indian/Maldives)'
    },
    {
      value: 'Antarctica/DumontDUrville',
      text: 'West Pacific Standard Time (Antarctica/DumontDUrville)'
    },
    { value: 'Etc/GMT-10', text: 'West Pacific Standard Time (Etc/GMT-10)' },
    {
      value: 'Pacific/Guam',
      text: 'West Pacific Standard Time (Pacific/Guam)'
    },
    {
      value: 'Pacific/Port_Moresby',
      text: 'West Pacific Standard Time (Pacific/Port_Moresby)'
    },
    {
      value: 'Pacific/Saipan',
      text: 'West Pacific Standard Time (Pacific/Saipan)'
    },
    {
      value: 'Pacific/Truk',
      text: 'West Pacific Standard Time (Pacific/Truk)'
    },
    { value: 'Asia/Khandyga', text: 'Yakutsk Standard Time (Asia/Khandyga)' },
    { value: 'Asia/Yakutsk', text: 'Yakutsk Standard Time (Asia/Yakutsk)' }
  ].filter((t) => {
    if (timezones) return timezones.indexOf(t.value) !== -1;
    else return true;
  });
  const childrenWithProps = React.Children.map(children, (child) =>
    React.cloneElement(child, { options, ...props })
  );

  return <div>{childrenWithProps}</div>;
}

TimezoneOptions.propTypes = {
  children: PropTypes.node.isRequired,
  timezones: PropTypes.arrayOf(PropTypes.string).isRequired
};

export { TimezoneOptions };
