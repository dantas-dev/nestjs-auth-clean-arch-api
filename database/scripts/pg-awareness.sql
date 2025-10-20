-- RAW QUERY: query SQL direto, sem ORM                                                                                   
-- Busca usuários com email do Gmail usando LIKE (pattern matching)   
SELECT * FROM users
WHERE email LIKE '%@gmail%';

------------------------------------------------------------------------

-- EXPLAIN ANALYZE: mostra o plano de execução da query + tempo real                                                      
-- Similar ao EXPLAIN do MySQL, mas ANALYZE executa a query de fato (MySQL só estima)                                     
--                                                                                                                        
-- Leitura do resultado:                                                                                                  
--   Seq Scan on users                → varreu a tabela inteira (sem índice)                                                       
--   cost=0.00..1.14                  → custo estimado (início..fim) em unidades arbitrárias                                       
--   rows=1                           → linhas estimadas pelo planner                                                              
--   actual time=0.011..0.013         → tempo real em ms (início..fim)                                                            
--   rows=5                           → linhas reais retornadas                                                                    
--   loops=1                          → quantas vezes executou esse nó                                                             
--   Filter: ((email)::text ~~ '%@gmail%'::text) → filtro aplicado (LIKE nesse caso)                                                          
--   Rows Removed by Filter: 6        → linhas descartadas pelo filtro                                                             
--   Planning Time: 0.049ms           → tempo pra montar o plano                                                                   
--   Execution Time: 0.023ms          → tempo total de execução                                                                    
--                                                                                                                        
-- Seq Scan = lento em tabelas grandes. Se aparecer, considere criar um índice.                                           
-- Index Scan = usa índice, muito mais rápido.                 
-- PRA QUE SERVE: identificar queries lentas e entender por que são lentas.                                               
-- Caso real: "GET /users tá demorando 2s". Roda EXPLAIN ANALYZE na query                                                 
-- e descobre que é Seq Scan numa tabela com 1M registros. Cria um índice,                                                
-- roda de novo e vê que virou Index Scan com 0.5ms.                                                                      
-- Sem EXPLAIN ANALYZE, você fica chutando onde está o gargalo.                                                                                                                      
EXPLAIN ANALYZE SELECT * FROM users WHERE email LIKE '%@gmail%';

------------------------------------------------------------------------

-- RETURNING: retorna os dados do registro afetado na mesma query                                                       
-- Sem RETURNING: precisa de INSERT + SELECT (2 queries)                                                                  
-- Com RETURNING: só INSERT (1 query)          

-- Inserir usuário e retornar o registro criado (com id gerado)                                                           
INSERT INTO users (name, email, password)                                                                                 
VALUES ('João', 'joao@mail.com', 'hash123')                                                                               
RETURNING *;                                                                                                              

-- Retornar só campos específicos                                                                                         
INSERT INTO users (name, email, password)                              
VALUES ('Maria', 'maria@mail.com', 'hash456')      
RETURNING id, email, created_at;                                                                                          

-- Funciona com UPDATE                                                                              
UPDATE users SET name = 'João Silva' WHERE id = 1 RETURNING *;      
-- e DELETE também       
DELETE FROM users WHERE id = 1 RETURNING id, email;   

------------------------------------------------------------------------

-- IMPORTANTE: ON CONFLICT (coluna) só funciona se existir um unique index/constraint                                     
-- EXATO na coluna. Partial indexes (com WHERE) precisam ser referenciados pelo nome:                                     
-- ON CONFLICT ON CONSTRAINT "nome_do_index" DO ...    

-- ON CONFLICT: upsert (insere ou atualiza se já existe)                                                                  
-- Sem ON CONFLICT: precisa de SELECT + IF + INSERT ou UPDATE (3 queries)                                               
-- Com ON CONFLICT: 1 query resolve              

-- pra teste apenas                                                                                                       
CREATE UNIQUE INDEX tmp_email_unique ON users (email);

-- Inserir usuário, se email já existe atualiza o nome                                                                    
INSERT INTO users (name, email, password)                                                                                 
VALUES ('João', 'admin@nestapp.com', 'hash123')                                                                           
ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name, updated_at = NOW()                                              
RETURNING *;                                                                                                              

-- EXCLUDED = referência aos valores que tentaram ser inseridos                                                           

-- Se não quer atualizar nada, só ignorar o conflito                                                                      
INSERT INTO users (name, email, password)                                                                               
VALUES ('João', 'admin@nestapp.com', 'hash123')                                                                           
ON CONFLICT (email) DO NOTHING;                                                                                           

-- depois remove                                   
DROP INDEX tmp_email_unique;  