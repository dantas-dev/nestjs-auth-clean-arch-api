const oneSecond = 1000;
const oneMinute = oneSecond * 60;
const fiveMinutes = oneMinute * 5;

/**
 * Listagens mudam frequentemente (criação/edição/exclusão).
 * TTL curto evita servir dados stale por muito tempo.
 */
export const USER_LIST_CACHE_TTL = oneMinute;

/**
 * Detalhe de user muda pouco. TTL maior reduz hits no banco
 * sem comprometer consistência (write-through atualiza cache).
 */
export const USER_DETAILS_CACHE_TTL = fiveMinutes;
