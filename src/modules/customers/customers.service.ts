import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { Customer } from './entities/customers.entity';

@Injectable()
export class CustomersService {
  constructor(
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
  ) {}

  create(dto: CreateCustomerDto): Promise<Customer> {
    const customer = this.customerRepository.create(dto);
    return this.customerRepository.save(customer);
  }

  findAll(): Promise<Customer[]> {
    return this.customerRepository.find();
  }

  async findOne(id: string): Promise<Customer> {
    const customer = await this.customerRepository.findOne({ where: { id } });
    if (!customer) {
      throw new NotFoundException(`Customer ${id} not found`);
    }
    return customer;
  }

  async update(id: string, dto: UpdateCustomerDto): Promise<Customer> {
    const customer = await this.findOne(id);
    Object.assign(customer, dto);
    return this.customerRepository.save(customer);
  }

  async remove(id: string): Promise<void> {
    const result = await this.customerRepository.delete(id);
    if (!result.affected) {
      throw new NotFoundException(`Customer ${id} not found`);
    }
  }

  async findByDNI(dni: string): Promise<Customer> {
    const customer = await this.customerRepository.findOneBy({ dni });
    if (!customer) {
      throw new NotFoundException(`Customer with ${dni} not found`);
    }
    return customer;
  }

  async findOrCreateByDni(
    dto: CreateCustomerDto,
  ): Promise<{ customer: Customer; created: boolean }> {
    let customer = await this.customerRepository.findOneBy({ dni: dto.dni });
    if (customer) {
      return { customer, created: false };
    }
    customer = this.customerRepository.create(dto);
    customer = await this.customerRepository.save(customer);
    return { customer, created: true };
  }
}
