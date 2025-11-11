import { Component, HostBinding, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SwUpdate } from '@angular/service-worker';
import { AuthService } from '../../services/auth.service';
import { UsuarioLogin } from '../../models/usuario-login';


@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnInit{
  @HostBinding('class.theme-danger') isDangerTheme = false;

  constructor(private swUpdate: SwUpdate,
    private authService: AuthService) { }

ngOnInit() {
  this.authService.currentUser$.subscribe((user: UsuarioLogin | null) => {
      this.checkUserTheme(user);
    });
    
    if (this.swUpdate.isEnabled) {
      this.swUpdate.versionUpdates.subscribe(evt => {
        switch (evt.type) {
          case 'VERSION_DETECTED':
            console.log(`Downloading new app version: ${evt.version.hash}`);
            break;
          case 'VERSION_READY':
            console.log(`Current app version: ${evt.currentVersion.hash}`);
            console.log(`New app version ready for use: ${evt.latestVersion.hash}`);
            // Preguntar al usuario si quiere recargar la página
            if (confirm('Hay una nueva versión disponible. ¿Deseas cargarla ahora?')) {
              window.location.reload();
            }
            break;
          case 'VERSION_INSTALLATION_FAILED':
            console.error(`Failed to install app version '${evt.version.hash}': ${evt.error}`);
            break;
        }
      });
    }
  }

  /**
   * Revisa el usuario y activa o desactiva el tema "danger"
   */
  private checkUserTheme(user: UsuarioLogin | null): void {
    
    // Asumiendo que 'acceso: 4' es el que detona el color rojo
    if (user && user.roles.acceso === 4) {
      this.isDangerTheme = true;
    } else {
      this.isDangerTheme = false;
    }
  }
}