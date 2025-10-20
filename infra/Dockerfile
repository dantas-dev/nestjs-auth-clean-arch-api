## Stage 1 -- deps (instalar dependencias)       
FROM node:24.13.0-alpine AS base    

#### - node:24.13.0-alpine -- bate com o .nvmrc, alpine pra imagem menor                                                      
#### - npm ci -- install deterministico (usa package-lock.json exato, sem alterar)
#### - So copia package*.json primeiro pra aproveitar cache de layer (se source mudar, nao reinstala deps) 
#### - --legacy-peer-deps: ts-jest@29 exige peer jest@^29, mas temos jest@30. Flag ignora o conflito.                                                                           
FROM base AS deps                                       
WORKDIR /app                                                                                                             
COPY package*.json ./                        
RUN npm ci --legacy-peer-deps                                                             


## Stage 2 -- build (compilar TS -> JS)   
#### - Herda do stage deps (ja tem node_modules)                                                                              
#### - Copia todo o source
#### - npm run build = nest build -> gera ./dist   
FROM deps AS build                                                                                                       
COPY . .                                                               
RUN npm run build    

## Stage 3 -- prod (imagem final)                                                                                        
#### - Imagem limpa -- só prod deps (sem devDeps) + dist compilado     
#### - npm ci --omit=dev instala apenas dependências de produção                                                         
#### - COPY --from=build traz só o JS compilado, sem source TS  
FROM base AS prod                                                                                                        
WORKDIR /app                                                                                                             
COPY package*.json ./                            
RUN npm ci --omit=dev --legacy-peer-deps                        
COPY --from=build /app/dist ./dist
EXPOSE 5000                                                                                                              
CMD ["node", "dist/src/main"]

