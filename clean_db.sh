#!/bin/bash

cd Backend
rm ./prisma/dev.db
rm prisma/migrations/* -rf
npx prisma migrate dev --name init
npx prisma generate