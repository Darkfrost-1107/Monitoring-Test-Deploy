import type { Cronograma } from '@entities/model-cronogramas';
import type {
  DirectorDeLaFicha,
  DocenteDelPadron,
  EspecialistaDelPadron,
  InstitucionDelPadron,
} from '@features/reportes/lib/participantes-de-ficha';
import { TablaDeFicha, Rotulo, Casilla, TituloDeSeccion } from './tabla';

/**
 * Las tablas de datos que encabezan la ficha, distintas según a quién se
 * monitorea.
 *
 * Eran doscientas cuarenta líneas dentro de `FichaPrintable`, repartidas en dos
 * ramas de un condicional que repetían la tabla de la institución con
 * diferencias de una fila.
 */

interface Contexto {
  areaCurricular?: string;
  grado?: string;
  seccion?: string;
  cantidadEstudiantes?: number;
  cantidadEstudiantesNee?: number;
}

interface Props {
  visita: Cronograma;
  contexto?: Contexto;
  docente: DocenteDelPadron | null;
  especialista: EspecialistaDelPadron | null;
  institucion: InstitucionDelPadron | null;
  director: DirectorDeLaFicha;
}

/** Cargo del monitor cuando la visita la realiza la Dirección Regional. */
const DREP = 'DREP';

export const DatosDeLaVisita = (props: Props) =>
  props.visita.tipo === 'DIRECTIVO' ? <VisitaDirectiva {...props} /> : <VisitaADocente {...props} />;

const FilaDeContacto = ({ director }: { director: DirectorDeLaFicha }) => (
  <tr>
    <Rotulo>DNI:</Rotulo>
    <td>{director.dni}</td>
    <Rotulo>E-MAIL:</Rotulo>
    <td>{director.correo}</td>
    <Rotulo>N° CELULAR:</Rotulo>
    <td>{director.celular}</td>
  </tr>
);

const VisitaDirectiva = ({ visita, contexto, especialista, institucion, director }: Props) => (
  <>
    <TituloDeSeccion>DATOS DE LA INSTITUCIÓN EDUCATIVA:</TituloDeSeccion>
    <TablaDeFicha columnas={6}>
      <tr>
        <Rotulo>UGEL:</Rotulo>
        <td colSpan={5}>UGEL LAMPA</td>
      </tr>
      <tr>
        <Rotulo>INSTITUCIÓN EDUCATIVA:</Rotulo>
        <td colSpan={3}>{visita.institucion}</td>
        <Rotulo>CÓD. MODULAR:</Rotulo>
        <td>{institucion?.codigoModular || ''}</td>
      </tr>
      <tr>
        <Rotulo>MODALIDAD:</Rotulo>
        <td>{visita.modalidad || ''}</td>
        <Rotulo>NIVEL:</Rotulo>
        <td>{visita.nivel || ''}</td>
        <Rotulo>ÁREA:</Rotulo>
        <td>{contexto?.areaCurricular || ''}</td>
      </tr>
      <tr>
        <Rotulo colSpan={2}>APELLIDOS Y NOMBRES DEL DIRECTOR(A):</Rotulo>
        <td colSpan={4}>{director.nombre}</td>
      </tr>
      <FilaDeContacto director={director} />
      <tr>
        <Rotulo>ENCARGADO:</Rotulo>
        <Casilla
          marcada={director.condicion === 'Encargado' || director.condicion === 'Por Función'}
        />
        <Rotulo>DESIGNADO:</Rotulo>
        <Casilla marcada={director.condicion === 'Designado'} />
        <Rotulo>NOMBRADO:</Rotulo>
        <Casilla marcada={director.condicion === 'Nombrado'} />
      </tr>
    </TablaDeFicha>

    <TituloDeSeccion>DATOS DEL MONITOR:</TituloDeSeccion>
    <TablaDeFicha columnas={8}>
      <FilasDeMonitor especialista={especialista} deDrep />
      <FilasDeMonitor especialista={especialista} deDrep={false} nombreVisible={visita.especialista} />
    </TablaDeFicha>
  </>
);

/**
 * Un par de filas por procedencia del monitor.
 *
 * El formulario oficial reserva un bloque para el monitor de la Dirección
 * Regional. Ningún especialista del padrón tiene hoy ese cargo, de modo que ese
 * bloque sale en blanco: son casillas del formato, no un dato faltante.
 */
const FilasDeMonitor = ({
  especialista,
  deDrep,
  nombreVisible,
}: {
  especialista: EspecialistaDelPadron | null;
  deDrep: boolean;
  nombreVisible?: string;
}) => {
  const corresponde = deDrep ? especialista?.cargo === DREP : especialista?.cargo !== DREP;
  const dato = (valor?: string | null) => (corresponde ? (valor ?? '') : '');

  return (
    <>
      <tr>
        <Rotulo colSpan={3}>
          APELLIDOS Y NOMBRES MONITOR(A) {deDrep ? 'DREP' : 'UGEL'}
        </Rotulo>
        <td colSpan={5}>{dato(deDrep ? especialista?.nombre : nombreVisible)}</td>
      </tr>
      <tr>
        <Rotulo>DNI</Rotulo>
        <td>{dato(especialista?.dni)}</td>
        <Rotulo>CARGO</Rotulo>
        <td>{dato(especialista?.cargo)}</td>
        <Rotulo>E-MAIL</Rotulo>
        <td>{dato(especialista?.correo)}</td>
        <Rotulo>N° CELULAR</Rotulo>
        <td>{dato(especialista?.celular)}</td>
      </tr>
    </>
  );
};

/** Cargos de institución que también pueden monitorear. */
const CARGOS_DE_INSTITUCION = ['Director', 'Coordinador Pedagógico', 'Jefe de Taller'];

const VisitaADocente = ({ visita, contexto, docente, especialista, director }: Props) => {
  const cargo = especialista?.cargo ?? '';
  const esDeUgel = cargo !== DREP && !CARGOS_DE_INSTITUCION.includes(cargo);

  return (
    <>
      <TituloDeSeccion>DATOS DE LA INSTITUCIÓN EDUCATIVA:</TituloDeSeccion>
      <TablaDeFicha columnas={6}>
        <tr>
          <Rotulo>UGEL:</Rotulo>
          <td colSpan={5}>UGEL LAMPA</td>
        </tr>
        <tr>
          <Rotulo>INSTITUCIÓN EDUCATIVA:</Rotulo>
          <td colSpan={5}>{visita.institucion}</td>
        </tr>
        <tr>
          <Rotulo>MODALIDAD:</Rotulo>
          <td>{visita.modalidad || ''}</td>
          <Rotulo>NIVEL:</Rotulo>
          <td>{visita.nivel || ''}</td>
          <Rotulo>ÁREA:</Rotulo>
          <td>{contexto?.areaCurricular || ''}</td>
        </tr>
        <tr>
          <Rotulo colSpan={2}>APELLIDOS Y NOMBRES DEL DIRECTOR(A):</Rotulo>
          <td colSpan={4}>{director.nombre}</td>
        </tr>
        <FilaDeContacto director={director} />
        <tr>
          <Rotulo>ENCARGADO:</Rotulo>
          <Casilla marcada={director.condicion === 'Encargado'} />
          <Rotulo>DESIGNADO:</Rotulo>
          <Casilla marcada={director.condicion === 'Designado'} />
          <Rotulo>ENC. X FUNCIONES:</Rotulo>
          <Casilla marcada={director.condicion === 'Por Función'} />
        </tr>
      </TablaDeFicha>

      <TituloDeSeccion>DATOS DEL DOCENTE MONITOREADO:</TituloDeSeccion>
      <TablaDeFicha columnas={6}>
        <tr>
          <Rotulo colSpan={2}>APELLIDOS Y NOMBRES DEL DOCENTE:</Rotulo>
          <td colSpan={4}>{visita.docenteDirectivo}</td>
        </tr>
        <tr>
          <Rotulo>DNI:</Rotulo>
          <td>{docente?.dni || ''}</td>
          <Rotulo>E-MAIL:</Rotulo>
          <td>{docente?.correo || ''}</td>
          <Rotulo>N° CELULAR:</Rotulo>
          <td>{docente?.celular || ''}</td>
        </tr>
        <tr>
          <Rotulo>CONTRATADO:</Rotulo>
          <Casilla marcada={docente?.condicion === 'Contratado'} />
          <Rotulo>NOMBRADO:</Rotulo>
          <Casilla marcada={docente?.condicion === 'Nombrado'} />
          <Rotulo>OTRO:</Rotulo>
          <Casilla
            marcada={
              !!docente?.condicion &&
              docente.condicion !== 'Nombrado' &&
              docente.condicion !== 'Contratado'
            }
          />
        </tr>
        <tr>
          <Rotulo>MODALIDAD:</Rotulo>
          <td>{visita.modalidad || ''}</td>
          <Rotulo>NIVEL:</Rotulo>
          <td>{visita.nivel || ''}</td>
          <Rotulo>ÁREA:</Rotulo>
          <td>{contexto?.areaCurricular || ''}</td>
        </tr>
        <tr>
          <Rotulo>GRADO:</Rotulo>
          <td>{contexto?.grado || ''}</td>
          <Rotulo>SECCIÓN:</Rotulo>
          <td>{contexto?.seccion || ''}</td>
          <Rotulo>CANT. ESTUDIANTES:</Rotulo>
          <td>{contexto?.cantidadEstudiantes ?? ''}</td>
        </tr>
        <tr>
          <Rotulo>NEE:</Rotulo>
          <td>{contexto?.cantidadEstudiantesNee ?? ''}</td>
          <td colSpan={4} />
        </tr>
      </TablaDeFicha>

      <TituloDeSeccion>DATOS DEL(OS) MONITOR(ES):</TituloDeSeccion>
      <TablaDeFicha columnas={6}>
        <tr>
          <Rotulo>APELLIDOS Y NOMBRES:</Rotulo>
          <td colSpan={5}>
            <span className="mr-4">DREP ({cargo === DREP ? 'X' : ' '})</span>
            <span className="mr-4">
              UGEL ({esDeUgel ? 'X' : ' '}) {visita.especialista}
            </span>
            <span className="mr-4">DIRECTOR IE ({cargo === 'Director' ? 'X' : ' '})</span>
            <span>
              COORDINADOR (
              {cargo === 'Coordinador Pedagógico' || cargo === 'Jefe de Taller' ? 'X' : ' '})
            </span>
          </td>
        </tr>
        <tr>
          <Rotulo>DNI:</Rotulo>
          <td>{especialista?.dni || ''}</td>
          <Rotulo>E-MAIL:</Rotulo>
          <td>{especialista?.correo || ''}</td>
          <Rotulo>N° CELULAR:</Rotulo>
          <td>{especialista?.celular || ''}</td>
        </tr>
      </TablaDeFicha>
    </>
  );
};
