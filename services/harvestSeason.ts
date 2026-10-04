export function harvestSeasonForDate(value:string|Date):string{
  const date=value instanceof Date?value:new Date(String(value).slice(0,10)+'T12:00:00');
  if(Number.isNaN(date.getTime()))return'';
  const year=date.getFullYear();
  return date.getMonth()>=7
    ? year+'/'+String(year+1).slice(-2)
    : (year-1)+'/'+String(year).slice(-2);
}

export function currentHarvestSeason():string{
  return harvestSeasonForDate(new Date());
}

export function harvestSeasonCode(season:string):string{
  return season.replace('/','-');
}

export function harvestSeasonYearStart(season:string):number|undefined{
  const match=/^(\d{4})\/(\d{2})$/.exec(season);
  if(!match)return undefined;
  return Number(match[1]);
}


export function harvestSeasonForExpense(
  value:string|Date,
  category?:string|null,
  explicitSeason?:string|null
):string{
  const explicit=String(explicitSeason||'').trim();
  if(/^\d{4}\/\d{2}$/.test(explicit))return explicit;

  const date=value instanceof Date?value:new Date(String(value).slice(0,10)+'T12:00:00');
  if(Number.isNaN(date.getTime()))return explicit||'';

  const normalized=String(category||'').toLowerCase();
  const cropBuildCategories=new Set([
    'sprøyting','spraying',
    'gjødsel','fertilization',
    'vann','irrigation',
    'beskjæring','pruning',
    'nye_planter','planting',
    'trefelling','desuckering','young_tree_care',
  ]);

  if(cropBuildCategories.has(normalized)){
    const year=date.getFullYear();
    return year+'/'+String(year+1).slice(-2);
  }

  return harvestSeasonForDate(date);
}
