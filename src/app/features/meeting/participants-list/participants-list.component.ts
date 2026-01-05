import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatBadgeModule } from '@angular/material/badge';
import { MatDividerModule } from '@angular/material/divider';
import { LiveKitParticipant } from '../../../core/services/livekit.service';

import { Participant } from '../../../core/models/meeting.models';
import { UserRole } from '../../../core/models/auth.models';

@Component({
  selector: 'app-participants-list',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    MatTooltipModule,
    MatBadgeModule,
    MatDividerModule
  ],
  templateUrl: './participants-list.component.html',
  styleUrls: ['./participants-list.component.scss']
})
export class ParticipantsListComponent implements OnInit {
  @Input() participants: Participant[] = [];
  @Input() currentUserId: string = '';
  @Output() onMuteParticipant = new EventEmitter<string>();
  @Output() onRemoveParticipant = new EventEmitter<string>();

  hosts: Participant[] = [];
  regularParticipants: Participant[] = [];
  observers: Participant[] = [];

  ngOnInit(): void {
    this.categorizeParticipants();
  }

  ngOnChanges(): void {
    this.categorizeParticipants();
  }

  private categorizeParticipants(): void {
    this.hosts = this.participants.filter(p =>
      p.role === UserRole.HOST || p.role === UserRole.ADMIN
    );

    this.regularParticipants = this.participants.filter(p =>
      p.role === UserRole.PARTICIPANT
    );

    this.observers = this.participants.filter(p =>
      p.role === UserRole.OBSERVER
    );
  }

  canManageParticipant(participant: Participant): boolean {
    // 只有主持人可以管理其他参与者，且不能管理自己
    return participant.userId !== this.currentUserId &&
           this.isCurrentUserHost();
  }

  private isCurrentUserHost(): boolean {
    const currentUser = this.participants.find(p => p.userId === this.currentUserId);
    return currentUser?.role === 'host' || currentUser?.role === 'admin';
  }

  getInitials(name: string): string {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  getRoleDisplayName(role: string): string {
    const roleMap: { [key: string]: string } = {
      'admin': '管理员',
      'host': '主持人',
      'participant': '参与者',
      'observer': '观察者'
    };
    return roleMap[role] || '参与者';
  }

  trackByParticipantId(index: number, participant: Participant): string {
    return participant.userId;
  }
}
