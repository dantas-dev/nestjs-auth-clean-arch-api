import {
  Column,
  Entity,
  Index,
  CreateDateColumn,
  DeleteDateColumn,
  UpdateDateColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Exclude } from 'class-transformer';

@Entity('users')
// Partial unique index: garante email unico apenas entre registros ativos (deleted_at IS NULL).
// Um @Unique(['email', 'deletedAt']) normal nao funciona pq PostgreSQL trata NULL como distinto,
// permitindo multiplos registros ativos com mesmo email.
@Index('UQ_users_email_active', ['email'], {
  unique: true,
  where: '"deleted_at" IS NULL',
})
export class UserModel {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 255 })
  email: string;

  @Column({ type: 'varchar', length: 255 })
  // @Exclude() -- criado UserPresenter para controlar o que é exposto na resposta, nao precisa mais do @Exclude aqui
  password: string;

  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ type: 'timestamp', nullable: true, name: 'deleted_at' })
  // @Exclude() -- criado UserPresenter para controlar o que é exposto na resposta, nao precisa mais do @Exclude aqui
  deletedAt: Date | null;
}
