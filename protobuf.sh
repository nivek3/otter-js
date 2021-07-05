#!/usr/bin/env bash
PROTO_IMPORT_DIR="./proto"

# Directory to write generated code to (.js and .d.ts files)
GEN_OUT_DIR="./src/__proto__"

# Create the generated output dir if it doesn't exist
rm -rf ${GEN_OUT_DIR} 
mkdir -p ${GEN_OUT_DIR}

# Proto path
FILE_PATHS=`find ${PROTO_IMPORT_DIR} -name "*.proto" -type f`

npx proto-loader-gen-types \
    --longs=String \
    --enums=String \
    --defaults \
    --oneofs \
    --grpcLib=@grpc/grpc-js \
    --outDir=${GEN_OUT_DIR} \
    ${FILE_PATHS}

# npx pbjs -t static-module -w commonjs -o $GEN_OUT_DIR/compiled.js $FILE_PATHS
# npx pbts -o $GEN_OUT_DIR/compiled.d.ts $GEN_OUT_DIR/compiled.js

for dir in $(ls -l $GEN_OUT_DIR | awk '/^d/ {print $NF}')
do
  npx barrelsby -d ${GEN_OUT_DIR}/${dir} -n types
done