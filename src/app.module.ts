import { Module } from '@nestjs/common';
import { ConfigModule, ConfigType } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import databaseConfig from './config/database.config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CustomersModule } from './modules/customers/customers.module';
import { VehiclesModule } from './modules/vehicles/vehicles.module';
import { LocationsModule } from './modules/locations/locations.module';
import { DigitalSignaturesModule } from './modules/digital-signatures/digital-signatures.module';
import { ReturnStatesModule } from './modules/return-states/return-states.module';
import { ImagesModule } from './modules/images/images.module';
import { TestDriveFormsModule } from './modules/test-drive-forms/test-drive-forms.module';
import { SurveysModule } from './modules/surveys/surveys.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig],
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [databaseConfig.KEY],
      useFactory: (dbConfig: ConfigType<typeof databaseConfig>) => ({
        type: 'postgres',
        host: dbConfig.host,
        port: dbConfig.port,
        username: dbConfig.username,
        password: dbConfig.password,
        database: dbConfig.database,
        autoLoadEntities: true,
        synchronize: dbConfig.synchronize,
        dropSchema: dbConfig.dropSchema,
        extra: {
          options: '-c timezone=America/Lima',
        },
      }),
    }),
    CustomersModule,
    VehiclesModule,
    LocationsModule,
    DigitalSignaturesModule,
    ReturnStatesModule,
    ImagesModule,
    TestDriveFormsModule,
    SurveysModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
